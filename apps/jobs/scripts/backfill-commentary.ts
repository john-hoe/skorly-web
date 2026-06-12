/**
 * Replay finished fixtures' real events through the commentary generator and
 * persist the entries. Doubles as the pre-launch test harness (replaying real
 * matches end-to-end) and as an ops tool to backfill timelines for matches
 * played before the feature existed.
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/backfill-commentary.ts [fixtureId...]
 *   (no args = all finished fixtures from the last 7 days)
 */
import {
  getFixtureEvents,
  getLiveCommentary,
  getResultsFixtures,
  insertLiveCommentaryDeduped,
  type FixtureView,
} from "@skorly/db";
import type { LiveFixtureEventSnapshot, LiveFixtureSummary } from "@skorly/types";
import {
  buildTemplateEntries,
  type CommentaryEntryDraft,
} from "../src/live-commentary";

function toSummary(f: FixtureView, homeGoals: number, awayGoals: number, status: "live" | "finished", elapsed: number | null): LiveFixtureSummary {
  return {
    id: f.id,
    apiId: f.apiId,
    slug: f.slug,
    round: f.round,
    groupName: f.groupName,
    kickoffAt: f.kickoffAt ? new Date(f.kickoffAt).toISOString() : null,
    status,
    elapsed,
    homeGoals,
    awayGoals,
    home: f.home as LiveFixtureSummary["home"],
    away: f.away as LiveFixtureSummary["away"],
  };
}

async function replayFixture(f: FixtureView): Promise<number> {
  const existing = await getLiveCommentary(f.id, 1);
  if (existing.length) {
    console.log(`[skip] ${f.slug} already has commentary`);
    return 0;
  }

  const events = (await getFixtureEvents(f.id)) as LiveFixtureEventSnapshot[];
  const ordered = [...events].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  const drafts: CommentaryEntryDraft[] = [];
  let homeGoals = 0;
  let awayGoals = 0;
  let prevShort: string | null = null;
  let prevSummary: LiveFixtureSummary | null = null;
  let halftimeEmitted = false;

  const step = (
    statusShort: string,
    status: "live" | "finished",
    elapsed: number | null,
    newEvents: LiveFixtureEventSnapshot[],
  ) => {
    const summary = toSummary(f, homeGoals, awayGoals, status, elapsed);
    drafts.push(
      ...buildTemplateEntries({
        fixture: summary,
        statusShort,
        prevStatusShort: prevShort,
        prevFixture: prevSummary,
        newEvents,
        stats: null,
        prevStats: null,
      }),
    );
    prevShort = statusShort;
    prevSummary = summary;
  };

  // Kickoff.
  step("1H", "live", 0, []);

  for (const event of ordered) {
    const minute = event.minute ?? 0;
    if (!halftimeEmitted && minute > 45) {
      step("HT", "live", 45, []);
      step("2H", "live", 46, []);
      halftimeEmitted = true;
    }
    if ((event.type ?? "").toLowerCase() === "goal" && !/missed penalty/i.test(event.detail ?? "")) {
      if (event.teamName === f.home.name) homeGoals += 1;
      else if (event.teamName === f.away.name) awayGoals += 1;
    }
    step(minute > 45 ? "2H" : "1H", "live", minute, [event]);
  }

  // Full-time with the official final score from the fixtures table.
  homeGoals = f.homeGoals ?? homeGoals;
  awayGoals = f.awayGoals ?? awayGoals;
  step("FT", "finished", 90, []);

  const inserted = await insertLiveCommentaryDeduped(
    f.id,
    drafts.map((d) => ({
      dedupeKey: d.dedupeKey,
      sortKey: d.sortKey,
      minute: d.minute,
      type: d.type,
      texts: d.texts,
    })),
  );

  console.log(`\n${f.home.name} ${f.homeGoals}-${f.awayGoals} ${f.away.name} — ${inserted} entries`);
  for (const d of drafts) {
    console.log(`  ${String(d.minute ?? "").padStart(3)}' [${d.type}] ${d.texts.zh}`);
  }
  return inserted;
}

async function main() {
  const ids = process.argv.slice(2).map(Number).filter(Number.isFinite);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const finished = (await getResultsFixtures(40)).filter((f) => {
    if (f.status !== "finished") return false;
    if (ids.length) return ids.includes(f.id);
    const t = f.kickoffAt ? new Date(f.kickoffAt).getTime() : 0;
    return t >= cutoff;
  });

  if (!finished.length) {
    console.log("No matching finished fixtures.");
    process.exit(0);
  }

  let total = 0;
  for (const f of finished) total += await replayFixture(f);
  console.log(`\nDone. ${total} commentary entries written.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
