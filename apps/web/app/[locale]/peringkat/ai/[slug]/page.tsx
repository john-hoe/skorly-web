import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AI_PREDICTORS } from "@skorly/types";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { formatKickoffTime } from "@/lib/kickoff-time";
import { buildCanonicalMetadata } from "@/lib/seo";
import { getRuntimeAiPredictor, type RuntimeAiPrediction } from "@/lib/runtime-data";

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    AI_PREDICTORS.map((p) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "leaderboard" });
  const predictor = await getRuntimeAiPredictor(slug).catch(() => null);
  const name = predictor?.name ?? "Skorly AI";
  return {
    title: `${name} — ${t("title")}`,
    // UX surface, not an SEO target: keep AI profile pages out of the index.
    robots: { index: false, follow: true },
    ...buildCanonicalMetadata("/peringkat", locale),
  };
}

export default async function AiPredictorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const predictor = await getRuntimeAiPredictor(slug).catch(() => null);
  if (!predictor) notFound();

  const t = await getTranslations("leaderboard");
  const accuracy =
    predictor.played > 0 ? Math.round((predictor.correct / predictor.played) * 100) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Link href="/peringkat" className="text-sm font-medium text-[var(--brand)] hover:underline">
        ← {t("aiDetail.back")}
      </Link>

      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <span aria-hidden>🤖</span>
          {predictor.name}
        </h1>
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-relaxed text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">
            {t("aiDetail.strategyTitle")}:
          </span>{" "}
          {t(`aiDetail.strategy.${predictor.strategy}`)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("points")} value={predictor.points} />
        <StatCard label={t("played")} value={predictor.played} />
        <StatCard label={t("exact")} value={predictor.exact} />
        <StatCard
          label={t("aiDetail.accuracy")}
          value={accuracy != null ? `${accuracy}%` : "—"}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("aiDetail.upcomingTitle")}</h2>
        {predictor.upcoming.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("aiDetail.noUpcoming")}</p>
        ) : (
          <PredictionList rows={predictor.upcoming} locale={locale} mode="upcoming" t={t} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("aiDetail.resultsTitle")}</h2>
        {predictor.results.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("aiDetail.noResults")}</p>
        ) : (
          <PredictionList rows={predictor.results} locale={locale} mode="results" t={t} />
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
      <div className="text-xl font-bold tabular-nums text-[var(--brand)]">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}

function PredictionList({
  rows,
  locale,
  mode,
  t,
}: {
  rows: RuntimeAiPrediction[];
  locale: string;
  mode: "upcoming" | "results";
  t: Awaited<ReturnType<typeof getTranslations<"leaderboard">>>;
}) {
  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      {rows.map((r) => (
        <li key={r.fixtureId}>
          <Link
            href={{ pathname: "/pertandingan/[slug]", params: { slug: r.slug } }}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--background)]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {r.homeName} <span className="text-[var(--muted)]">vs</span> {r.awayName}
              </span>
              <span className="text-xs text-[var(--muted)]">
                {formatKickoffTime(r.kickoffAt ? new Date(r.kickoffAt) : null, locale, "compact")}
              </span>
            </span>

            <span className="shrink-0 text-right text-sm">
              <span className="block tabular-nums">
                <span className="text-[var(--muted)]">{t("aiDetail.pick")} </span>
                <span className="font-bold">
                  {r.homeGoalsPred}-{r.awayGoalsPred}
                </span>
              </span>
              {mode === "results" && r.homeGoals != null && r.awayGoals != null && (
                <span className="block text-xs text-[var(--muted)] tabular-nums">
                  {t("aiDetail.actual")} {r.homeGoals}-{r.awayGoals}
                </span>
              )}
            </span>

            {mode === "results" && r.pointsAwarded != null && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  r.pointsAwarded > 0
                    ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                    : "bg-[var(--border)] text-[var(--muted)]"
                }`}
              >
                +{r.pointsAwarded}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
