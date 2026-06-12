import { beforeEach, describe, expect, it, vi } from "vitest";

const getFixtureMedia = vi.fn();
const getResultsFixtures = vi.fn();
const insertFixtureMediaDeduped = vi.fn();

vi.mock("@skorly/db", () => ({
  getFixtureMedia,
  getResultsFixtures,
  insertFixtureMediaDeduped,
}));

const { fetchHighlights, isHighlightMatch, isVideoEmbeddable, titleMentionsTeam, HIGHLIGHT_CHANNELS } =
  await import("./fetch-highlights");

const FIFA = HIGHLIGHT_CHANNELS[0]!.channelId;

function mockKv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    store,
  };
}

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    apiId: 1538999,
    slug: "south-korea-vs-czech-republic-20260612",
    round: "Group Stage - 1",
    groupName: "Group F",
    stage: null,
    kickoffAt: new Date("2026-06-12T02:00:00Z"),
    venue: null,
    city: null,
    status: "finished",
    homeGoals: 2,
    awayGoals: 1,
    elapsed: null,
    homeTeamId: 15,
    awayTeamId: 25,
    home: { id: 15, name: "South Korea", slug: "south-korea", logo: null, code: "KOR" },
    away: { id: 25, name: "Czech Republic", slug: "czech-republic", logo: null, code: "CZE" },
    ...overrides,
  };
}

function searchResponse(items: unknown[]) {
  return Response.json({ items });
}

/** URL-aware fetch mock: search.list returns `items`, videos.list returns status. */
function youtubeFetch(items: unknown[], embeddable: boolean | "error" = true) {
  return vi.fn(async (url: string) => {
    if (url.includes("/youtube/v3/videos")) {
      if (embeddable === "error") return new Response("boom", { status: 500 });
      return Response.json({ items: [{ status: { embeddable } }] });
    }
    return searchResponse(items);
  });
}

const VALID_ITEMS = [
  {
    id: { videoId: "abc123def45" },
    snippet: {
      title: "South Korea v Czech Republic | 2026 FIFA World Cup | Match Highlights",
      channelId: FIFA,
      channelTitle: "FIFA",
      publishedAt: "2026-06-12T05:00:00Z",
    },
  },
];

describe("title matching", () => {
  it("requires every significant team word in the title", () => {
    expect(titleMentionsTeam("SOUTH KOREA v CZECH REPUBLIC | Highlights", "South Korea")).toBe(true);
    expect(titleMentionsTeam("Mexico v South Africa | Highlights", "South Korea")).toBe(false);
  });

  it("accepts FIFA naming aliases", () => {
    expect(titleMentionsTeam("Korea Republic v Czech Republic | Highlights", "South Korea")).toBe(true);
    expect(titleMentionsTeam("United States v Paraguay | Highlights", "USA")).toBe(true);
    // FIFA uses "Czechia": Korea Republic 2-1 Czechia | FIFA World Cup 2026
    expect(titleMentionsTeam("Korea Republic 2-1 Czechia | FIFA World Cup 2026", "Czech Republic")).toBe(true);
    expect(
      isHighlightMatch(
        "Oh Hyeon-gyu Goal | Korea Republic 2-1 Czechia | FIFA World Cup 2026™",
        "South Korea",
        "Czech Republic",
      ),
    ).toBe(true);
  });

  it("does not substring-match across country names", () => {
    expect(titleMentionsTeam("Nigeria v Ghana | Highlights", "Niger")).toBe(false);
  });

  it("matches both teams for a valid highlight title", () => {
    expect(
      isHighlightMatch(
        "South Korea v Czech Republic | Group F | 2026 FIFA World Cup Highlights",
        "South Korea",
        "Czech Republic",
      ),
    ).toBe(true);
    expect(
      isHighlightMatch("Canada v Bosnia | Highlights", "South Korea", "Czech Republic"),
    ).toBe(false);
  });
});

describe("fetchHighlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    getFixtureMedia.mockResolvedValue([]);
    getResultsFixtures.mockResolvedValue([]);
    insertFixtureMediaDeduped.mockResolvedValue(1);
  });

  it("soft-skips without an API key", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    const result = await fetchHighlights({ kv: mockKv() as unknown as KVNamespace });
    expect(result).toMatchObject({ ok: true, skipped: true, reason: "no_key" });
  });

  it("stores a validated official embed and respects attempt markers", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    const now = new Date("2026-06-12T08:00:00Z"); // 6h after kickoff
    getResultsFixtures.mockResolvedValue([fixture()]);
    const fetchImpl = youtubeFetch([
      ...VALID_ITEMS,
      {
        id: { videoId: "wrongchannel" },
        snippet: { title: "South Korea v Czech Republic", channelId: "OTHER", channelTitle: "X" },
      },
    ]);
    const kv = mockKv();

    const result = await fetchHighlights({
      kv: kv as unknown as KVNamespace,
      now,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toMatchObject({ ok: true, skipped: false, fixtures: 1, searches: 1, found: 1 });
    // FIFA is embedBlocked: stored as link-out regardless of the API status.
    expect(insertFixtureMediaDeduped).toHaveBeenCalledWith(2, [
      expect.objectContaining({ videoId: "abc123def45", channelId: FIFA, embeddable: false }),
    ]);

    // Second run within the spacing window: attempt marker blocks a re-search.
    const second = await fetchHighlights({
      kv: kv as unknown as KVNamespace,
      now: new Date("2026-06-12T08:30:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(second.searches).toBe(0);
  });

  it("skips fixtures that already have media and ones outside the window", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    getResultsFixtures.mockResolvedValue([
      fixture(),
      fixture({ id: 3, kickoffAt: new Date("2026-06-01T02:00:00Z") }), // too old
    ]);
    getFixtureMedia.mockResolvedValue([{ videoId: "existing" }]); // fixture 2 covered
    const fetchImpl = vi.fn();

    const result = await fetchHighlights({
      kv: mockKv() as unknown as KVNamespace,
      now: new Date("2026-06-12T08:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.fixtures).toBe(0);
  });

  it("never calls videos.list for embed-blocked channels (flag decides)", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    getResultsFixtures.mockResolvedValue([fixture()]);
    const fetchImpl = youtubeFetch(VALID_ITEMS, true);

    await fetchHighlights({
      kv: mockKv() as unknown as KVNamespace,
      now: new Date("2026-06-12T08:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(insertFixtureMediaDeduped).toHaveBeenCalledWith(2, [
      expect.objectContaining({ videoId: "abc123def45", embeddable: false }),
    ]);
    expect(
      fetchImpl.mock.calls.filter(([url]) => String(url).includes("/youtube/v3/videos")),
    ).toHaveLength(0);
  });

  it("treats an embeddable-lookup failure as not embeddable (safe link-out)", async () => {
    expect(
      await isVideoEmbeddable("k", "vid", (async () =>
        new Response("err", { status: 500 })) as unknown as typeof fetch),
    ).toBe(false);
    expect(
      await isVideoEmbeddable("k", "vid", (async () =>
        Response.json({ items: [{ status: { embeddable: true } }] })) as unknown as typeof fetch),
    ).toBe(true);
  });

  it("does not store anything when no title validates", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    getResultsFixtures.mockResolvedValue([fixture()]);
    const fetchImpl = vi.fn(async () =>
      searchResponse([
        {
          id: { videoId: "unrelated123" },
          snippet: { title: "Best goals of the week", channelId: FIFA, channelTitle: "FIFA" },
        },
      ]),
    );

    const result = await fetchHighlights({
      kv: mockKv() as unknown as KVNamespace,
      now: new Date("2026-06-12T08:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.found).toBe(0);
    expect(insertFixtureMediaDeduped).not.toHaveBeenCalled();
  });
});
