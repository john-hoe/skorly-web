import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllFixtures, type FixtureView } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { MatchCard } from "@/components/match-card";
import { formatKickoffDay, kickoffDayKey } from "@/lib/kickoff-time";
import { buildCanonicalMetadata, pageSeoDescription } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const title = `${t("team.fixtures")} — ${t("nav.worldCup")}`;
  return {
    title,
    description: pageSeoDescription(locale, "schedule"),
    ...buildCanonicalMetadata("/jadwal", locale),
  };
}

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const fixtures = await getAllFixtures().catch(() => []);

  const byDay = new Map<string, { day: Date | null; fixtures: FixtureView[] }>();
  for (const f of fixtures) {
    const key = kickoffDayKey(f.kickoffAt, locale);
    const group = byDay.get(key) ?? { day: f.kickoffAt, fixtures: [] };
    group.fixtures.push(f);
    byDay.set(key, group);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("team.fixtures")}</h1>
        <p className="mt-1 text-[var(--muted)]">{t("nav.worldCup")}</p>
      </header>

      {Array.from(byDay.entries()).map(([day, group]) => (
        <section key={day}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {formatKickoffDay(group.day, locale)}
          </h2>
          <div className="grid gap-3">
            {group.fixtures.map((f) => (
              <MatchCard key={f.id} fixture={f} locale={locale} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
