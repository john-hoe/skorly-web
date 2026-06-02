import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLiveFixtures, getResultsFixtures } from "@skorly/db";
import { toScoreRow } from "@/lib/score-types";
import { LiveScoreboard } from "@/components/live-scoreboard";
import { ScoreRow } from "@/components/score-row";
import { buildAlternates } from "@/lib/seo";

// Live data — short ISR window; the live section also self-polls on the client.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "scores" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: buildAlternates("/skor", locale),
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
    getLiveFixtures().catch(() => []),
    getResultsFixtures(40).catch(() => []),
  ]);
  const initialLive = live.map(toScoreRow);
  const resultRows = results.map(toScoreRow);

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
        <LiveScoreboard initial={initialLive} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("recentResults")}</h2>
        {resultRows.length === 0 ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
            {t("noResults")}
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            {resultRows.map((row) => (
              <ScoreRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
