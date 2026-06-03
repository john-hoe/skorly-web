import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGroupedTeams } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { TeamBadge } from "@/components/team-badge";
import { buildAlternates } from "@/lib/seo";

type TeamGroups = Awaited<ReturnType<typeof getGroupedTeams>>;

let groupedTeamsPromise: Promise<TeamGroups> | undefined;

function getGroupedTeamsForBuild(): Promise<TeamGroups> {
  groupedTeamsPromise ??= getGroupedTeams().catch(() => []);
  return groupedTeamsPromise;
}

// Fully static for public SEO stability. Team data is cached during build so
// this route does not hit Supabase at Cloudflare Worker runtime.
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
  const title = `${t("team.allTeams")} — ${t("nav.worldCup")}`;
  return {
    title,
    description: title,
    alternates: buildAlternates("/tim", locale),
  };
}

export default async function TeamsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const groups = await getGroupedTeamsForBuild();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("team.allTeams")}</h1>
        <p className="mt-1 text-[var(--muted)]">{t("nav.worldCup")} 2026</p>
      </header>

      {groups.map((g) => (
        <section key={g.group}>
          <h2 className="mb-3 text-lg font-semibold">
            {t("team.group")} {g.group.replace("Group ", "").toUpperCase()}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {g.teams.map((team) => (
              <Link
                key={team.id}
                href={{ pathname: "/tim/[slug]", params: { slug: team.slug } }}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 transition hover:border-[var(--brand)]"
              >
                <TeamBadge name={team.name} logo={team.logo} code={team.code} />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
