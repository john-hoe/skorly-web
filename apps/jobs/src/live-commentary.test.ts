import { describe, expect, it } from "vitest";
import {
  buildTemplateEntries,
  diffNewEvents,
  mergeCommentary,
  type CommentaryContext,
} from "./live-commentary";
import type { LiveFixtureEventSnapshot, LiveFixtureSummary } from "@skorly/types";

const LOCALES = ["id", "vi", "en", "zh"] as const;

function fixture(overrides: Partial<LiveFixtureSummary> = {}): LiveFixtureSummary {
  return {
    id: 2,
    apiId: 1538999,
    slug: "south-korea-vs-czech-republic-20260612",
    round: "Group Stage - 1",
    groupName: "Group F",
    kickoffAt: "2026-06-12T02:00:00.000Z",
    status: "live",
    elapsed: 10,
    homeGoals: 0,
    awayGoals: 0,
    home: { id: 15, name: "South Korea", slug: "south-korea", logo: null, code: "KOR" },
    away: { id: 25, name: "Czech Republic", slug: "czech-republic", logo: null, code: "CZE" },
    ...overrides,
  };
}

function event(overrides: Partial<LiveFixtureEventSnapshot> = {}): LiveFixtureEventSnapshot {
  return {
    minute: 12,
    type: "Goal",
    detail: "Normal Goal",
    teamId: 15,
    teamName: "South Korea",
    playerName: "H. Son",
    ...overrides,
  };
}

function ctx(overrides: Partial<CommentaryContext> = {}): CommentaryContext {
  return {
    fixture: fixture(),
    statusShort: "1H",
    prevStatusShort: "1H",
    prevFixture: fixture(),
    newEvents: [],
    stats: null,
    prevStats: null,
    ...overrides,
  };
}

describe("diffNewEvents", () => {
  it("returns only events absent from the previous snapshot", () => {
    const previous = [event()];
    const current = [event(), event({ minute: 30, playerName: "P. Schick", teamName: "Czech Republic" })];
    const fresh = diffNewEvents(previous, current);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.playerName).toBe("P. Schick");
  });

  it("treats an undefined previous snapshot as all-new", () => {
    expect(diffNewEvents(undefined, [event()])).toHaveLength(1);
  });
});

describe("buildTemplateEntries", () => {
  it("emits a kickoff entry when the match goes live", () => {
    const entries = buildTemplateEntries(
      ctx({ prevFixture: fixture({ status: "scheduled" }), prevStatusShort: null }),
    );
    const kickoff = entries.find((e) => e.type === "kickoff");
    expect(kickoff).toBeDefined();
    for (const locale of LOCALES) {
      expect(kickoff!.texts[locale]).toContain("South Korea vs Czech Republic");
    }
  });

  it("emits goal entries with score and penalty tag in all locales", () => {
    const entries = buildTemplateEntries(
      ctx({
        fixture: fixture({ homeGoals: 1 }),
        newEvents: [event({ detail: "Penalty" })],
      }),
    );
    const goal = entries.find((e) => e.type === "goal");
    expect(goal).toBeDefined();
    expect(goal!.minute).toBe(12);
    expect(goal!.texts.en).toContain("H. Son");
    expect(goal!.texts.en).toContain("1-0");
    expect(goal!.texts.en).toContain("penalty");
    expect(goal!.texts.zh).toContain("点球");
    for (const locale of LOCALES) expect(goal!.texts[locale].length).toBeGreaterThan(8);
  });

  it("skips missed penalties", () => {
    const entries = buildTemplateEntries(
      ctx({ newEvents: [event({ detail: "Missed Penalty" })] }),
    );
    expect(entries.find((e) => e.type === "goal")).toBeUndefined();
  });

  it("distinguishes red and yellow cards", () => {
    const entries = buildTemplateEntries(
      ctx({
        newEvents: [
          event({ type: "Card", detail: "Red Card", playerName: "Y. Sithole", minute: 49 }),
          event({ type: "Card", detail: "Yellow Card", playerName: "T. Mokoena", minute: 17 }),
        ],
      }),
    );
    expect(entries.find((e) => e.type === "red_card")?.texts.zh).toContain("红牌");
    expect(entries.find((e) => e.type === "yellow_card")?.texts.en).toContain("Yellow card");
  });

  it("emits half-time / second-half / full-time transitions exactly once", () => {
    const ht = buildTemplateEntries(ctx({ statusShort: "HT", prevStatusShort: "1H" }));
    expect(ht.find((e) => e.type === "halftime")).toBeDefined();

    const htAgain = buildTemplateEntries(ctx({ statusShort: "HT", prevStatusShort: "HT" }));
    expect(htAgain.find((e) => e.type === "halftime")).toBeUndefined();

    const sh = buildTemplateEntries(ctx({ statusShort: "2H", prevStatusShort: "HT" }));
    expect(sh.find((e) => e.type === "second_half")).toBeDefined();

    const ft = buildTemplateEntries(
      ctx({
        fixture: fixture({ status: "finished", homeGoals: 2, awayGoals: 1 }),
        statusShort: "FT",
        prevStatusShort: "2H",
        prevFixture: fixture({ status: "live" }),
      }),
    );
    const ftEntry = ft.find((e) => e.type === "fulltime");
    expect(ftEntry).toBeDefined();
    expect(ftEntry!.texts.en).toContain("2-1");
  });

  it("emits a stats digest when crossing a milestone with stats present", () => {
    const stats = {
      updatedAt: "2026-06-12T02:21:00.000Z",
      possessionHome: 58,
      possessionAway: 42,
      shotsHome: 7,
      shotsAway: 3,
      shotsOnHome: 4,
      shotsOnAway: 1,
      cornersHome: 3,
      cornersAway: 1,
      foulsHome: 5,
      foulsAway: 8,
    };
    const entries = buildTemplateEntries(
      ctx({
        fixture: fixture({ elapsed: 21 }),
        prevFixture: fixture({ elapsed: 19 }),
        stats,
      }),
    );
    const digest = entries.find((e) => e.type === "stats");
    expect(digest).toBeDefined();
    expect(digest!.texts.en).toContain("58%-42%");
    expect(digest!.texts.en).toContain("7-3");

    // Same bucket already crossed → no duplicate.
    const again = buildTemplateEntries(
      ctx({ fixture: fixture({ elapsed: 23 }), prevFixture: fixture({ elapsed: 22 }), stats }),
    );
    expect(again.find((e) => e.type === "stats")).toBeUndefined();
  });
});

describe("mergeCommentary", () => {
  it("dedupes by key, keeps chronological order and caps the list", () => {
    const drafts = buildTemplateEntries(
      ctx({ newEvents: [event()], prevFixture: fixture({ status: "scheduled" }), prevStatusShort: null }),
    );
    const first = mergeCommentary(undefined, drafts);
    const second = mergeCommentary(first, drafts);
    expect(second).toHaveLength(first.length);
    const sorted = [...second].sort((a, b) => a.sortKey - b.sortKey);
    expect(second).toEqual(sorted);
  });
});
