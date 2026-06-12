import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFixturesByGroup, getStandingsByGroup, getGroupNames } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { MatchCard } from "@/components/match-card";
import { StandingsTable } from "@/components/standings-table";
import { buildCanonicalMetadata, pageSeoDescription } from "@/lib/seo";
import { withBuildRetry } from "@/lib/build-retry";

// Fully static: prerendered at build, no DB at runtime.
export const dynamicParams = false;

export async function generateStaticParams() {
  // Retry transient pooler errors, then fail the build on empty data: with
  // dynamicParams=false a swallowed error here would silently drop every
  // group page (all 404) until next deploy.
  const groups = await withBuildRetry("grup:getGroupNames", () => getGroupNames());
  if (groups.length === 0) {
    throw new Error("[grup] getGroupNames returned 0 rows at build time");
  }
  return routing.locales.flatMap((locale) =>
    groups.map((g) => ({ locale, group: g.replace("Group ", "").toLowerCase() }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; group: string }>;
}): Promise<Metadata> {
  const { locale, group } = await params;
  const t = await getTranslations({ locale });
  const title = `${t("nav.groups")} ${group.toUpperCase()} — ${t("nav.worldCup")}`;
  return {
    title,
    description: pageSeoDescription(locale, "group", group.toUpperCase()),
    ...buildCanonicalMetadata(
      { pathname: "/piala-dunia-2026/grup/[group]", params: { group: group.toLowerCase() } },
      locale
    ),
  };
}

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
            <MatchCard key={f.id} fixture={f} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}
