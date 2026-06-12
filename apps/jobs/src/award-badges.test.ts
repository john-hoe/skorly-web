import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  awardAiSlayerBadges,
  currentIsoWeek,
  previousIsoWeek,
  selectAiSlayers,
} from "./award-badges";
import { appendProfileBadge, getProfileIdsByEmails, getScoredTotalsBetween } from "@skorly/db";

vi.mock("@skorly/db", () => ({
  appendProfileBadge: vi.fn(),
  getProfileIdsByEmails: vi.fn(),
  getScoredTotalsBetween: vi.fn(),
}));

function memoryKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, v);
    },
  };
}

describe("ISO week windows", () => {
  it("computes the previous completed week from a mid-week date", () => {
    // Friday 2026-06-12 → previous week is Mon 06-01 .. Mon 06-08 (W23).
    const w = previousIsoWeek(new Date("2026-06-12T14:00:00Z"));
    expect(w.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(w.label).toBe("2026-W23");
  });

  it("treats Monday as the first day of the week", () => {
    // Monday itself: previous week ends today at 00:00.
    const w = previousIsoWeek(new Date("2026-06-08T00:30:00Z"));
    expect(w.end.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(w.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("handles Sunday correctly (still inside the current week)", () => {
    const w = currentIsoWeek(new Date("2026-06-14T23:00:00Z"));
    expect(w.start.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(w.label).toBe("2026-W24");
  });

  it("labels year-boundary weeks with the ISO year", () => {
    // 2027-01-01 is a Friday; that week (Mon 2026-12-28) is 2026-W53.
    const w = currentIsoWeek(new Date("2027-01-01T12:00:00Z"));
    expect(w.label).toBe("2026-W53");
  });
});

describe("selectAiSlayers", () => {
  const ai = new Set(["ai-1", "ai-2"]);
  const row = (userId: string, points: number, played = 5) => ({
    userId,
    points,
    played,
    exact: 0,
  });

  it("returns null when no AI scored that week", () => {
    expect(selectAiSlayers([row("u1", 10)], ai)).toBeNull();
  });

  it("picks only humans who strictly beat the best AI", () => {
    const totals = [
      row("ai-1", 8),
      row("ai-2", 11),
      row("u-tied", 11),
      row("u-beat", 12),
      row("u-low", 5),
    ];
    const result = selectAiSlayers(totals, ai);
    expect(result?.aiBest).toBe(11);
    expect(result?.winners.map((w) => w.userId)).toEqual(["u-beat"]);
  });

  it("requires the minimum number of scored predictions", () => {
    const totals = [row("ai-1", 4), row("u-lucky", 15, 2), row("u-grinder", 15, 3)];
    const result = selectAiSlayers(totals, ai);
    expect(result?.winners.map((w) => w.userId)).toEqual(["u-grinder"]);
  });
});

describe("awardAiSlayerBadges", () => {
  const totals = [
    { userId: "ai-1", points: 4, played: 5, exact: 0 },
    { userId: "u-1", points: 10, played: 5, exact: 1 },
  ];

  beforeEach(() => {
    vi.mocked(getScoredTotalsBetween).mockResolvedValue(totals);
    vi.mocked(getProfileIdsByEmails).mockResolvedValue([
      { id: "ai-1", email: "ai-elo@skorly.cc" },
    ]);
    vi.mocked(appendProfileBadge).mockReset().mockResolvedValue(true);
  });

  it("skips inside the settle grace period without writing a marker", async () => {
    const kv = memoryKv();
    // Monday 01:00 UTC — one hour after the previous week closed.
    const result = await awardAiSlayerBadges({ kv, now: new Date("2026-06-15T01:00:00Z") });
    expect(result.skipped).toBe(true);
    expect(kv.store.size).toBe(0);
    expect(appendProfileBadge).not.toHaveBeenCalled();
  });

  it("awards after the grace period and seals the week", async () => {
    const kv = memoryKv();
    const result = await awardAiSlayerBadges({ kv, now: new Date("2026-06-16T01:00:00Z") });
    expect(result).toMatchObject({ ok: true, winners: 1, awarded: 1, aiBest: 4 });
    expect(result.week).toBe("2026-W24");
    expect(kv.store.get("badges:ai-slayer:2026-W24")).toBe("done");
  });

  it("leaves the week unsealed when an append fails so the next run retries", async () => {
    vi.mocked(appendProfileBadge).mockRejectedValue(new Error("db down"));
    const kv = memoryKv();
    const result = await awardAiSlayerBadges({ kv, now: new Date("2026-06-16T01:00:00Z") });
    expect(result.ok).toBe(false);
    expect(kv.store.has("badges:ai-slayer:2026-W24")).toBe(false);
  });
});
