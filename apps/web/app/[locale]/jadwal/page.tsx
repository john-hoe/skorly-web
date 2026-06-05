import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllFixtures, type FixtureView } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { MatchCard } from "@/components/match-card";
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

function dayKey(d: Date | null): string {
  if (!d) return "TBD";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
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

  // Group by calendar day (Jakarta TZ).
  const byDay = new Map<string, FixtureView[]>();
  for (const f of fixtures) {
    const key = dayKey(f.kickoffAt);
    const list = byDay.get(key) ?? [];
    list.push(f);
    byDay.set(key, list);
  }

  const dayFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("team.fixtures")}</h1>
        <p className="mt-1 text-[var(--muted)]">{t("nav.worldCup")}</p>
      </header>

      {Array.from(byDay.entries()).map(([day, dayFixtures]) => (
        <section key={day}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {day === "TBD"
              ? "TBD"
              : dayFormatter.format(new Date(`${day}T12:00:00`))}
          </h2>
          <div className="grid gap-3">
            {dayFixtures.map((f) => (
              <MatchCard key={f.id} fixture={f} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
