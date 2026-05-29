import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFixturesByGroup, getStandingsByGroup } from "@skorly/db";
import { MatchCard } from "@/components/match-card";
import { StandingsTable } from "@/components/standings-table";

export const revalidate = 300;
export const dynamicParams = true;

export default async function GroupPage({
  params,
}: {
  params: Promise<{ locale: string; group: string }>;
}) {
  const { locale, group } = await params;
  setRequestLocale(locale);
  if (!group) notFound();
  const t = await getTranslations();

  const groupName = `Group ${group.toUpperCase()}`;
  const [fixtures, standings] = await Promise.all([
    getFixturesByGroup(groupName).catch(() => []),
    getStandingsByGroup(groupName).catch(() => []),
  ]);

  if (!fixtures.length && !standings.length) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("nav.groups")} {group.toUpperCase()}
      </h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Klasemen</h2>
        <StandingsTable rows={standings} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("nav.matches")}</h2>
        <div className="grid gap-3">
          {fixtures.map((f) => (
            <MatchCard key={f.id} fixture={f} />
          ))}
        </div>
      </section>
    </div>
  );
}
