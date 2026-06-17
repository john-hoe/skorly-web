/**
 * Post-match recap generation. Finds fixtures that finished within the last
 * RECAP_WINDOW_HOURS and still lack a recap article, then generates and
 * persists one per locale through the existing QA pipeline. Facts (final
 * score + real goal events from fixture_events) are passed in so the writer
 * cannot invent goals.
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/run-generate-recaps.ts
 */
import { PUBLIC_LOCALES, type Locale } from "@skorly/types";
import {
  getResultsFixtures,
  getFixtureEvents,
  insertArticle,
  articleExists,
  type FixtureView,
  type FixtureEventView,
} from "@skorly/db";
import { generateArticle, recapPrompt, type MatchContext } from "@skorly/ai-content";

const LOCALES: readonly Locale[] = PUBLIC_LOCALES;
const RECAP_WINDOW_HOURS = 36;
const RECAP_IMAGE = "/news/result.webp";

function toContext(f: FixtureView): MatchContext {
  return {
    fixture: {
      apiId: f.apiId,
      slug: f.slug,
      groupName: f.groupName,
      stage: f.stage,
      kickoffAt: f.kickoffAt ? new Date(f.kickoffAt).toISOString() : null,
      status: f.status as MatchContext["fixture"]["status"],
      homeGoals: f.homeGoals,
      awayGoals: f.awayGoals,
      home: { apiId: 0, name: f.home.name, slug: f.home.slug },
      away: { apiId: 0, name: f.away.name, slug: f.away.slug },
    },
  };
}

function sameEventSubject(a: FixtureEventView, b: FixtureEventView): boolean {
  return (
    a.minute === b.minute &&
    a.teamId === b.teamId &&
    (a.playerName ?? "").trim().toLowerCase() === (b.playerName ?? "").trim().toLowerCase()
  );
}

function isDisallowedGoalReview(e: FixtureEventView): boolean {
  return (
    (e.type ?? "").toLowerCase() === "var" &&
    /goal disallowed|disallowed|offside/i.test(e.detail ?? "")
  );
}

function validGoalEvents(events: FixtureEventView[]): FixtureEventView[] {
  const disallowed = events.filter(isDisallowedGoalReview);
  return events.filter((e) => {
    if ((e.type ?? "").toLowerCase() !== "goal") return false;
    return !disallowed.some((d) => sameEventSubject(e, d));
  });
}

async function buildFacts(f: FixtureView): Promise<string> {
  const events = await getFixtureEvents(f.id).catch(() => []);
  const totalGoals = (f.homeGoals ?? 0) + (f.awayGoals ?? 0);
  const goals = validGoalEvents(events)
    .map((e) => `${e.minute ?? "?"}' ${e.playerName ?? "unknown"} (${e.teamName ?? "?"})`);
  const cards = events
    .filter((e) => (e.type ?? "").toLowerCase() === "card" && /red/i.test(e.detail ?? ""))
    .map((e) => `${e.minute ?? "?"}' red card: ${e.playerName ?? "unknown"} (${e.teamName ?? "?"})`);
  const goalFacts = goals.length === totalGoals && totalGoals > 0
    ? `Goals: ${goals.join("; ")}.`
    : totalGoals === 0
      ? "No goals were scored."
      : "Goal scorer and minute details are not complete enough to publish from the verified event feed.";

  const lines = [
    `Final score: ${f.home.name} ${f.homeGoals ?? 0}-${f.awayGoals ?? 0} ${f.away.name}.`,
    f.groupName ? `Stage: ${f.groupName}, World Cup 2026.` : `World Cup 2026.`,
    f.venue ? `Venue: ${f.venue}${f.city ? `, ${f.city}` : ""}.` : "",
    goalFacts,
    cards.length ? `${cards.join("; ")}.` : "",
    "Only use the facts above. Do not invent goals, scorers, assists or statistics.",
  ].filter(Boolean);
  return lines.join(" ");
}

async function recapFixture(f: FixtureView): Promise<number> {
  const ctx = toContext(f);
  const entities = [f.home.name, f.away.name, `${f.homeGoals ?? 0}-${f.awayGoals ?? 0}`];
  const facts = await buildFacts(f);
  let written = 0;

  for (const locale of LOCALES) {
    const slug = `${f.slug}-recap`;
    if (await articleExists(slug, locale)) continue;

    try {
      // recapPrompt only carries the scoreline; append the verified event
      // facts to the writer prompt itself, otherwise the writer invents
      // scorers and the judge (which does see the facts) rejects the draft.
      const base = recapPrompt(ctx);
      const prompt = {
        system: base.system,
        user: `${base.user}\n\nVerified match facts — use ONLY these, do not invent any scorer, minute or event:\n${facts}`,
      };
      const res = await generateArticle(prompt, {
        locale,
        expectedEntities: entities,
        facts,
        review: {
          theme: "a post-match recap for a 2026 FIFA World Cup fixture",
          facts,
        },
      });
      await insertArticle({
        slug,
        locale,
        type: "recap",
        title: res.title || `${f.home.name} ${f.homeGoals ?? 0}-${f.awayGoals ?? 0} ${f.away.name}`,
        summary: null,
        body: res.body,
        imageUrl: RECAP_IMAGE,
        fixtureId: f.id,
        groupName: f.groupName,
        status: res.status,
        qualityScore: res.qualityScore,
        qaLog: res.qaLog,
        model: res.model,
      });
      written++;
      console.log(
        `  [${res.status} ${res.qualityScore ?? "-"}] ${locale} recap: ${res.title.slice(0, 70)}`,
      );
    } catch (error) {
      console.error(`  [error] ${locale} recap for ${f.slug}:`, error);
    }
  }
  return written;
}

async function main() {
  const cutoff = Date.now() - RECAP_WINDOW_HOURS * 60 * 60 * 1000;
  const finished = (await getResultsFixtures(40)).filter((f) => {
    const t = f.kickoffAt ? new Date(f.kickoffAt).getTime() : 0;
    return f.status === "finished" && t >= cutoff;
  });

  if (!finished.length) {
    console.log("No recently finished fixtures. Nothing to do.");
    process.exit(0);
  }

  console.log(`${finished.length} recently finished fixture(s).`);
  let total = 0;
  for (const f of finished) {
    console.log(`\n${f.home.name} ${f.homeGoals ?? 0}-${f.awayGoals ?? 0} ${f.away.name}`);
    total += await recapFixture(f);
  }
  console.log(`\nDone. ${total} recap article(s) written.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
