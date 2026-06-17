import type { Metadata } from "next";
import type { LiveFixtureSummary } from "@skorly/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ScoreRow as ScoreRowData } from "@/lib/score-types";
import { toScoreRow } from "@/lib/score-types";
import { LiveScoreboard } from "@/components/live-scoreboard";
import { ScoreRow } from "@/components/score-row";
import { SeoIntentLinks } from "@/components/seo-intent-links";
import { buildCanonicalMetadata, pageSeoDescription, pageSeoTitle } from "@/lib/seo";
import { getLiveAllSnapshot } from "@/lib/live-kv";
import { getRuntimeResultsFixtures } from "@/lib/runtime-data";

// Live score data should be read at request time. Static generation can block
// production builds when the Supabase pooler stalls.
export const dynamic = "force-dynamic";

const SCORE_DATA_TIMEOUT_MS = 10_000;

async function withScoreDataTimeout(
  label: string,
  work: Promise<ScoreRowData[]>
): Promise<ScoreRowData[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ScoreRowData[]>((resolve) => {
    timer = setTimeout(() => {
      console.warn(
        `[scores-page] ${label} exceeded ${SCORE_DATA_TIMEOUT_MS}ms; rendering fallback data.`
      );
      resolve([]);
    }, SCORE_DATA_TIMEOUT_MS);
    if (timer && typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }
  });

  try {
    return await Promise.race([
      work.catch((error) => {
        console.warn(`[scores-page] ${label} failed; rendering fallback data.`, error);
        return [];
      }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function liveSummaryToScoreRow(fixture: LiveFixtureSummary): ScoreRowData {
  return {
    id: fixture.id,
    slug: fixture.slug,
    status: fixture.status,
    elapsed: fixture.elapsed,
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
    kickoff: fixture.kickoffAt,
    groupName: fixture.groupName,
    round: fixture.round,
    home: {
      name: fixture.home.name,
      code: fixture.home.code,
      logo: fixture.home.logo,
    },
    away: {
      name: fixture.away.name,
      code: fixture.away.code,
      logo: fixture.away.logo,
    },
  };
}

async function getLiveScoreRowsFromKv(): Promise<ScoreRowData[]> {
  const snapshot = await getLiveAllSnapshot().catch(() => null);
  return (snapshot?.fixtures ?? []).map(liveSummaryToScoreRow);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: pageSeoTitle(locale, "scores"),
    description: pageSeoDescription(locale, "scores"),
    ...buildCanonicalMetadata("/skor", locale),
  };
}

export default async function ScoresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("scores");
  const [live, results] = await Promise.all([
    withScoreDataTimeout("getLiveSnapshot", getLiveScoreRowsFromKv()),
    withScoreDataTimeout(
      "getResultsFixtures",
      getRuntimeResultsFixtures(40).then((rows) => rows.map(toScoreRow))
    ),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("subtitle")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {t("liveNow")}
        </h2>
        <LiveScoreboard initial={live} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("recentResults")}</h2>
        {results.length === 0 ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
            {t("noResults")}
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            {results.map((row) => (
              <ScoreRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>

      <SeoIntentLinks variant="scores" />
    </div>
  );
}
