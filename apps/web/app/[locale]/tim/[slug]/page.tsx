import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getAllTeamPages,
  getTeamFixtures,
  getTeamSquad,
} from "@skorly/db";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { MatchCard } from "@/components/match-card";
import { JsonLd } from "@/components/json-ld";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  buildCanonicalMetadata,
  fitMetaTitle,
  localizedPath,
  pageSeoDescription,
} from "@/lib/seo";

type Team = Awaited<ReturnType<typeof getAllTeamPages>>[number] | null;
type TeamPages = Awaited<ReturnType<typeof getAllTeamPages>>;
type TeamFixtures = Awaited<ReturnType<typeof getTeamFixtures>>;
type TeamSquad = Awaited<ReturnType<typeof getTeamSquad>>;

const OPTIONAL_BUILD_DATA_TIMEOUT_MS = 8_000;

let allTeamPagesPromise: Promise<TeamPages> | undefined;
let teamBySlugPromise: Promise<Map<string, NonNullable<Team>>> | undefined;
const teamFixturesCache = new Map<number, Promise<TeamFixtures>>();
const teamSquadCache = new Map<number, Promise<TeamSquad>>();

function getAllTeamPagesForBuild(): Promise<TeamPages> {
  allTeamPagesPromise ??= getAllTeamPages().catch(() => []);
  return allTeamPagesPromise;
}

async function getTeamBySlugForBuild() {
  if (!teamBySlugPromise) {
    teamBySlugPromise = getAllTeamPagesForBuild().then((teams) => {
      const map = new Map<string, NonNullable<Team>>();
      for (const team of teams) map.set(team.slug, team);
      return map;
    });
  }
  return teamBySlugPromise;
}

async function getTeamForPage(slug: string): Promise<Team> {
  const teams = await getTeamBySlugForBuild();
  return teams.get(slug) ?? null;
}

function withOptionalBuildTimeout<T>(label: string, work: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[team-page] ${label} exceeded ${OPTIONAL_BUILD_DATA_TIMEOUT_MS}ms; rendering fallback.`);
      resolve(fallback);
    }, OPTIONAL_BUILD_DATA_TIMEOUT_MS);
    if (timer && typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }
  });

  return Promise.race([
    work.catch((error) => {
      console.warn(`[team-page] ${label} failed; rendering fallback.`, error);
      return fallback;
    }),
    timeout,
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getTeamFixturesForPage(teamId: number): Promise<TeamFixtures> {
  let cached = teamFixturesCache.get(teamId);
  if (!cached) {
    cached = withOptionalBuildTimeout(`fixtures for team ${teamId}`, getTeamFixtures(teamId), []);
    teamFixturesCache.set(teamId, cached);
  }
  return cached;
}

function getTeamSquadForPage(teamId: number): Promise<TeamSquad> {
  let cached = teamSquadCache.get(teamId);
  if (!cached) {
    cached = withOptionalBuildTimeout(`squad for team ${teamId}`, getTeamSquad(teamId), []);
    teamSquadCache.set(teamId, cached);
  }
  return cached;
}

// Fully static for public SEO stability. Build-time DB reads are cached across
// metadata/page rendering and across locales, avoiding runtime Supabase reads.
export const dynamicParams = false;

export async function generateStaticParams() {
  const teams = await getAllTeamPagesForBuild();
  return routing.locales.flatMap((locale) => teams.map((team) => ({ locale, slug: team.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const team = await getTeamForPage(slug);
  if (!team) return {};
  const t = await getTranslations({ locale });
  const title = fitMetaTitle(
    `${team.name} — ${t("team.squad")} & ${t("team.fixtures")} 2026`,
    46
  );
  const description = pageSeoDescription(locale, "team", team.name);
  const canonicalMetadata = buildCanonicalMetadata(
    { pathname: "/tim/[slug]", params: { slug } },
    locale
  );
  return {
    title,
    description,
    ...canonicalMetadata,
    openGraph: {
      ...canonicalMetadata.openGraph,
      title,
      description,
      images: team.logo ? [team.logo] : undefined,
    },
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const team = await getTeamForPage(slug);
  if (!team) notFound();

  const t = await getTranslations();
  const [fixtures, squad] = await Promise.all([
    getTeamFixturesForPage(team.id),
    getTeamSquadForPage(team.id),
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
              <MatchCard key={f.id} fixture={f} locale={locale} />
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
