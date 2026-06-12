/**
 * Regenerate prediction articles for upcoming fixtures, grounded in the
 * in-house Elo/Poisson forecast (the original batch run gave the writer no
 * data, so every article guessed the same generic scoreline).
 *
 * Replacement is upsert-on-(slug,locale) and only happens when the new
 * article passes the QA gate (status=published) — a failed generation keeps
 * the existing article instead of degrading it.
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/regenerate-predictions.ts
 *   pnpm tsx --env-file=.env apps/jobs/scripts/regenerate-predictions.ts --locale zh --limit 2
 */
import type { Locale } from "@skorly/types";
import {
  getAllFixtures,
  getMatchForecast,
  insertArticle,
  type FixtureView,
  type MatchForecastView,
} from "@skorly/db";
import { generateArticle, predictionPrompt, type MatchContext } from "@skorly/ai-content";

const ALL_LOCALES: Locale[] = ["id", "vi", "en", "zh"];
const CONCURRENCY = 4;
const MIN_LEAD_MS = 30 * 60 * 1000;

function parseArgs() {
  const args = process.argv.slice(2);
  let locales = ALL_LOCALES;
  let limit = Infinity;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--locale" && args[i + 1]) {
      locales = [args[i + 1] as Locale];
      i++;
    } else if (args[i] === "--limit" && args[i + 1]) {
      limit = Number(args[i + 1]);
      i++;
    }
  }
  return { locales, limit };
}

function toContext(f: FixtureView, fv: MatchForecastView): MatchContext {
  return {
    fixture: {
      apiId: f.apiId,
      slug: f.slug,
      groupName: f.groupName,
      stage: f.stage,
      kickoffAt: f.kickoffAt ? f.kickoffAt.toISOString() : null,
      status: f.status as MatchContext["fixture"]["status"],
      home: { apiId: 0, name: f.home.name, slug: f.home.slug },
      away: { apiId: 0, name: f.away.name, slug: f.away.slug },
    },
    forecast: {
      probabilities: fv.forecast.probabilities,
      mostLikelyScore: fv.forecast.mostLikelyScore,
      topScores: fv.forecast.topScores.slice(0, 3),
      confidence: fv.forecast.confidence,
    },
  };
}

async function regenerate(f: FixtureView, locale: Locale, fv: MatchForecastView) {
  const slug = `${f.slug}-prediction`;
  const ms = fv.forecast.mostLikelyScore;
  const facts =
    `Match: ${f.home.name} vs ${f.away.name}, ${f.groupName ?? "World Cup 2026"}. ` +
    `In-house statistical model forecast: ${fv.summary}. ` +
    `The article's predicted final score must be exactly ${ms.home}-${ms.away}.`;

  const res = await generateArticle(predictionPrompt(toContext(f, fv)), {
    locale,
    expectedEntities: [f.home.name, f.away.name],
    facts,
  });

  if (res.status !== "published") {
    console.log(`  [keep-old ${res.qualityScore ?? "-"}] ${locale} ${slug} (new draft rejected)`);
    return { replaced: false };
  }

  await insertArticle({
    slug,
    locale,
    type: "prediction",
    title: res.title || `${f.home.name} vs ${f.away.name}`,
    summary: null,
    body: res.body,
    imageUrl: "/news/prediction.webp",
    fixtureId: f.id,
    groupName: f.groupName,
    status: res.status,
    qualityScore: res.qualityScore,
    qaLog: res.qaLog,
    model: res.model,
  });
  console.log(
    `  [published ${res.qualityScore ?? "-"}] ${locale} ${slug} -> ${ms.home}-${ms.away}`,
  );
  return { replaced: true };
}

async function pool<T>(items: T[], fn: (x: T) => Promise<void>, n: number) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const item = queue.shift()!;
        await fn(item);
      }
    }),
  );
}

async function main() {
  const { locales, limit } = parseArgs();
  const now = Date.now();

  const upcoming = (await getAllFixtures())
    .filter(
      (f) =>
        f.status === "scheduled" &&
        f.kickoffAt != null &&
        f.kickoffAt.getTime() > now + MIN_LEAD_MS,
    )
    .slice(0, limit);
  console.log(`${upcoming.length} upcoming fixtures × ${locales.length} locales`);

  const tasks: Array<{ f: FixtureView; locale: Locale; fv: MatchForecastView }> = [];
  for (const f of upcoming) {
    const fv = await getMatchForecast(f.id).catch(() => null);
    if (!fv) {
      console.warn(`[skip] no forecast for ${f.slug}`);
      continue;
    }
    for (const locale of locales) tasks.push({ f, locale, fv });
  }

  let replaced = 0;
  let kept = 0;
  let failed = 0;
  await pool(
    tasks,
    async ({ f, locale, fv }) => {
      try {
        const r = await regenerate(f, locale, fv);
        r.replaced ? replaced++ : kept++;
      } catch (e) {
        failed++;
        console.error(`  [error] ${locale} ${f.slug}:`, e instanceof Error ? e.message : e);
      }
    },
    CONCURRENCY,
  );

  console.log(`\nDone. replaced=${replaced} kept-old=${kept} failed=${failed}`);
  process.exit(failed > 0 && replaced === 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("regenerate-predictions failed:", e);
  process.exit(1);
});
