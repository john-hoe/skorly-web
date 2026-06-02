import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getAllTeamSlugs,
  getTeamBySlug,
  getTeamFixtures,
  getTeamSquad,
} from "@skorly/db";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { MatchCard } from "@/components/match-card";
import { TeamBadge } from "@/components/team-badge";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL, absoluteUrl, buildAlternates, localizedPath } from "@/lib/seo";

// Fully static: prerendered at build, no DB at runtime.
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllTeamSlugs().catch(() => []);
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const team = await getTeamBySlug(slug).catch(() => null);
  if (!team) return {};
  const t = await getTranslations({ locale });
  const title = `${team.name} — ${t("team.squad")}, ${t("team.fixtures")} | ${t(
    "nav.worldCup"
  )}`;
  const description = `${team.name} ${t("team.squad")}, ${t(
    "team.fixtures"
  )} & ${t("team.recentForm")} — ${SITE_NAME} ${t("nav.worldCup")} 2026.`;
  return {
    title,
    description,
    alternates: buildAlternates(
      { pathname: "/tim/[slug]", params: { slug } },
      locale
    ),
    openGraph: { title, description, images: team.logo ? [team.logo] : undefined },
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const team = await getTeamBySlug(slug).catch(() => null);
  if (!team) notFound();

  const t = await getTranslations();
  const [fixtures, squad] = await Promise.all([
    getTeamFixtures(team.id).catch(() => []),
    getTeamSquad(team.id).catch(() => []),
  ]);

  const groupLabel = team.group
    ? team.group.replace("Group ", "").toUpperCase()
    : null;

  const sportsTeam: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    sport: "Soccer",
    url: absoluteUrl(localizedPath({ pathname: "/tim/[slug]", params: { slug } }, locale)),
    ...(team.logo ? { logo: team.logo } : {}),
    ...(team.country ? { location: { "@type": "Country", name: team.country } } : {}),
    ...(squad.length
      ? {
          athlete: squad.map((p) => ({
            "@type": "Person",
            name: p.name,
            ...(p.nationality ? { nationality: p.nationality } : {}),
          })),
        }
      : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: `${SITE_URL}${localizedPath("/", locale)}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: team.name,
      },
    ],
  };

  // Group positions for nicer ordering (GK, DEF, MID, FWD).
  const posOrder: Record<string, number> = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Attacker: 3 };
  const sortedSquad = [...squad].sort((a, b) => {
    const pa = posOrder[a.position ?? ""] ?? 9;
    const pb = posOrder[b.position ?? ""] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.number ?? 999) - (b.number ?? 999);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <JsonLd data={[sportsTeam, breadcrumb]} />

      <header className="flex items-center gap-4">
        {team.logo ? (
          <Image
            src={team.logo}
            alt={team.name}
            width={56}
            height={56}
            className="object-contain"
            style={{ width: 56, height: 56 }}
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
          {groupLabel ? (
            <p className="text-sm text-[var(--muted)]">
              {t("team.group")} {groupLabel}
              {team.country ? ` · ${team.country}` : ""}
            </p>
          ) : team.country ? (
            <p className="text-sm text-[var(--muted)]">{team.country}</p>
          ) : null}
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("team.fixtures")}</h2>
        {fixtures.length ? (
          <div className="grid gap-3">
            {fixtures.map((f) => (
              <MatchCard key={f.id} fixture={f} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("team.noFixtures")}</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("team.squad")}</h2>
        {sortedSquad.length ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--card)] text-left text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 w-10">{t("team.number")}</th>
                  <th className="px-3 py-2">{t("team.player")}</th>
                  <th className="px-3 py-2">{t("team.position")}</th>
                  <th className="px-3 py-2 w-12 text-right">{t("team.age")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedSquad.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 tabular-nums text-[var(--muted)]">
                      {p.number ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">
                      {p.position ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">
                      {p.age ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("team.noSquad")}</p>
        )}
      </section>

      <div className="border-t border-[var(--border)] pt-4">
        <Link
          href="/piala-dunia-2026"
          className="text-sm text-[var(--brand)] hover:underline"
        >
          {t("nav.worldCup")} →
        </Link>
      </div>
    </div>
  );
}
