import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllFixtures, type FixtureView } from "@skorly/db";
import { MatchCard } from "@/components/match-card";
import { SeoIntentLinks } from "@/components/seo-intent-links";
import { formatKickoffDay, kickoffDayKey } from "@/lib/kickoff-time";
import { buildCanonicalMetadata, pageSeoDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

const SCHEDULE_DATA_TIMEOUT_MS = 10_000;

async function withScheduleDataTimeout(
  label: string,
  work: Promise<FixtureView[]>,
): Promise<FixtureView[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<FixtureView[]>((resolve) => {
    timer = setTimeout(() => {
      console.warn(
        `[schedule-page] ${label} exceeded ${SCHEDULE_DATA_TIMEOUT_MS}ms; rendering fallback data.`,
      );
      resolve([]);
    }, SCHEDULE_DATA_TIMEOUT_MS);
    if (timer && typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }
  });

  try {
    return await Promise.race([
      work.catch((error) => {
        console.warn(`[schedule-page] ${label} failed; rendering fallback data.`, error);
        return [];
      }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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

  const fixtures = await withScheduleDataTimeout("getAllFixtures", getAllFixtures());

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

      {fixtures.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
          {t("team.noFixtures")}
        </p>
      ) : (
        Array.from(byDay.entries()).map(([day, group]) => (
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
        ))
      )}

      <SeoIntentLinks variant="schedule" />
    </div>
  );
}
