import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGroupNames, getUpcomingFixtures } from "@skorly/db";
import { Link } from "@/i18n/navigation";
import { MatchCard } from "@/components/match-card";

export const revalidate = 300;

export default async function WorldCupHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [groups, fixtures] = await Promise.all([
    getGroupNames().catch(() => []),
    getUpcomingFixtures(8).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.worldCup")}</h1>
        <p className="mt-1 text-[var(--muted)]">{t("home.heroSubtitle")}</p>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t("nav.groups")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {groups.map((g) => {
            const letter = g.replace("Group ", "");
            return (
              <Link
                key={g}
                href={{ pathname: "/piala-dunia-2026/grup-[group]", params: { group: letter.toLowerCase() } }}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center transition hover:border-[var(--brand)]"
              >
                <span className="text-xs text-[var(--muted)]">{t("nav.groups")}</span>
                <p className="text-2xl font-bold text-[var(--brand)]">{letter}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t("home.upcomingMatches")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {fixtures.map((f) => (
            <MatchCard key={f.id} fixture={f} />
          ))}
        </div>
      </section>
    </div>
  );
}
