import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUpcomingFixtures } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { TeamBadge } from "@/components/team-badge";
import { buildAlternates, pageSeoDescription } from "@/lib/seo";

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
  const title = `${t("stories.title")} — ${t("nav.worldCup")}`;
  return {
    title,
    description: pageSeoDescription(locale, "stories"),
    alternates: buildAlternates("/cerita", locale),
  };
}

export default async function StoriesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const fixtures = await getUpcomingFixtures(24).catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("stories.title")}</h1>
        <p className="mt-1 text-[var(--muted)]">{t("stories.subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fixtures.map((f) => (
          <Link
            key={f.id}
            href={{ pathname: "/cerita/[slug]", params: { slug: f.slug } }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--brand)]/10 to-transparent p-4 text-center transition hover:border-[var(--brand)]"
          >
            <div className="flex items-center gap-2">
              <TeamBadge name={f.home.name} logo={f.home.logo} code={f.home.code} size={28} showName={false} />
              <span className="text-xs font-semibold text-[var(--muted)]">VS</span>
              <TeamBadge name={f.away.name} logo={f.away.logo} code={f.away.code} size={28} showName={false} />
            </div>
            <span className="text-sm font-medium leading-tight">
              {f.home.name} v {f.away.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
