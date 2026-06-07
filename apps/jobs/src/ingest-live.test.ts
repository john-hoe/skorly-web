import { beforeEach, describe, expect, it, vi } from "vitest";

const getFixtureEvents = vi.fn();
const getFixturesForLiveIngestWindow = vi.fn();
const getTeamIdsByApiIds = vi.fn();
const insertFixtureEventsDeduped = vi.fn();
const updateLiveFixtureState = vi.fn();

vi.mock("@skorly/db", () => ({
  getFixtureEvents,
  getFixturesForLiveIngestWindow,
  getTeamIdsByApiIds,
  insertFixtureEventsDeduped,
  updateLiveFixtureState,
}));

const { ingestLiveFixtures } = await import("./ingest-live");

function response(payload: unknown) {
  return Response.json({
    get: "test",
    parameters: {},
    errors: [],
    results: Array.isArray(payload) ? payload.length : 1,
    paging: { current: 1, total: 1 },
    response: payload,
  });
}

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

const dbFixture = {
  id: 10,
  apiId: 123,
  slug: "home-vs-away-20260611",
  round: "Group A - 1",
  groupName: "Group A",
  kickoffAt: new Date("2026-06-11T19:00:00Z"),
  status: "scheduled",
  homeGoals: null,
  awayGoals: null,
  elapsed: null,
  home: { id: 1, name: "Home", slug: "home", logo: null, code: "HOM" },
  away: { id: 2, name: "Away", slug: "away", logo: null, code: "AWY" },
};

describe("ingestLiveFixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFixtureEvents.mockResolvedValue([]);
    getFixturesForLiveIngestWindow.mockResolvedValue([]);
    getTeamIdsByApiIds.mockResolvedValue(new Map());
    insertFixtureEventsDeduped.mockResolvedValue(0);
    updateLiveFixtureState.mockResolvedValue(undefined);
  });

  it("skips API-Football when no fixture is in the live polling window", async () => {
    const kv = mockKv();
    const fetchImpl = vi.fn();

    const result = await ingestLiveFixtures({
      apiKey: "key",
      baseUrl: "https://api.test",
      kv: kv as unknown as KVNamespace,
      now: new Date("2026-06-08T00:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toMatchObject({ ok: true, skipped: true, reason: "no_window", apiCalls: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(kv.put).toHaveBeenCalledWith(
      "live:all",
      expect.stringContaining('"fixtures":[]'),
      { expirationTtl: 90 },
    );
  });

  it("updates DB state, inserts changed events, writes KV snapshots, and counts API calls", async () => {
    getFixturesForLiveIngestWindow.mockResolvedValue([dbFixture]);
    getTeamIdsByApiIds.mockResolvedValue(new Map([[777, 1]]));
    insertFixtureEventsDeduped.mockResolvedValue(1);
    getFixtureEvents.mockResolvedValue([
      {
        minute: 12,
        type: "Goal",
        detail: "Normal Goal",
        teamId: 1,
        teamName: "Home",
        playerName: "Scorer",
      },
    ]);
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/fixtures/events")) {
        return response([
          {
            time: { elapsed: 12, extra: null },
            team: { id: 777, name: "Home", logo: null },
            player: { id: 9, name: "Scorer" },
            assist: { id: null, name: null },
            type: "Goal",
            detail: "Normal Goal",
            comments: null,
          },
        ]);
      }
      return response([
        {
          fixture: {
            id: 123,
            date: "2026-06-11T19:00:00Z",
            timestamp: 1781204400,
            venue: { name: "Venue", city: "City" },
            status: { short: "1H", elapsed: 12 },
          },
          league: { id: 1, name: "World Cup", season: 2026, round: "Group A - 1" },
          teams: {
            home: { id: 777, name: "Home", logo: "" },
            away: { id: 888, name: "Away", logo: "" },
          },
          goals: { home: 1, away: 0 },
        },
      ]);
    });
    const kv = mockKv();

    const result = await ingestLiveFixtures({
      apiKey: "key",
      baseUrl: "https://api.test",
      kv: kv as unknown as KVNamespace,
      now: new Date("2026-06-11T19:12:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toMatchObject({
      ok: true,
      skipped: false,
      fixtures: 1,
      events: 1,
      reconciled: 0,
      apiCalls: 2,
      apiCallsToday: 2,
    });
    expect(updateLiveFixtureState).toHaveBeenCalledWith(
      expect.objectContaining({
        fixtureId: 10,
        status: "live",
        homeGoals: 1,
        awayGoals: 0,
        elapsed: 12,
      }),
    );
    expect(insertFixtureEventsDeduped).toHaveBeenCalledWith(10, [
      {
        minute: 12,
        type: "Goal",
        detail: "Normal Goal",
        teamId: 1,
        playerName: "Scorer",
      },
    ]);
    expect(kv.store.get("apiq:20260611")).toBe("2");
    expect(kv.store.get("live:fixture:10")).toContain('"status":"live"');
    expect(kv.store.get("live:all")).toContain('"fixtures":[{');
  });

  it("reconciles a previously-live DB fixture that dropped out of live=all", async () => {
    getFixturesForLiveIngestWindow.mockResolvedValue([{ ...dbFixture, status: "live" }]);
    getTeamIdsByApiIds.mockResolvedValue(new Map([[777, 1]]));
    insertFixtureEventsDeduped.mockResolvedValue(1);
    getFixtureEvents.mockResolvedValue([
      {
        minute: 90,
        type: "Goal",
        detail: "Normal Goal",
        teamId: 1,
        teamName: "Home",
        playerName: "Closer",
      },
    ]);
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/fixtures/events")) {
        return response([
          {
            time: { elapsed: 90, extra: null },
            team: { id: 777, name: "Home", logo: null },
            player: { id: 10, name: "Closer" },
            assist: { id: null, name: null },
            type: "Goal",
            detail: "Normal Goal",
            comments: null,
          },
        ]);
      }
      if (url.includes("id=123")) {
        return response([
          {
            fixture: {
              id: 123,
              date: "2026-06-11T19:00:00Z",
              timestamp: 1781204400,
              venue: { name: "Venue", city: "City" },
              status: { short: "FT", elapsed: 90 },
            },
            league: { id: 1, name: "World Cup", season: 2026, round: "Group A - 1" },
            teams: {
              home: { id: 777, name: "Home", logo: "" },
              away: { id: 888, name: "Away", logo: "" },
            },
            goals: { home: 2, away: 0 },
          },
        ]);
      }
      return response([]);
    });
    const kv = mockKv();

    const result = await ingestLiveFixtures({
      apiKey: "key",
      baseUrl: "https://api.test",
      kv: kv as unknown as KVNamespace,
      now: new Date("2026-06-11T21:00:00Z"),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toMatchObject({
      ok: true,
      skipped: false,
      fixtures: 0,
      events: 1,
      reconciled: 1,
      apiCalls: 3,
      apiCallsToday: 3,
    });
    expect(updateLiveFixtureState).toHaveBeenCalledWith(
      expect.objectContaining({
        fixtureId: 10,
        status: "finished",
        homeGoals: 2,
        awayGoals: 0,
        elapsed: 90,
      }),
    );
    expect(kv.store.get("live:fixture:10")).toContain('"status":"finished"');
    expect(kv.store.get("live:all")).toContain('"fixtures":[]');
  });
});
