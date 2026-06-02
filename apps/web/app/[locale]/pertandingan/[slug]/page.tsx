import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFixtureBySlug, getArticlesForFixture, getAllFixtures } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { TeamBadge } from "@/components/team-badge";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";
import { JsonLd } from "@/components/json-ld";
import { renderMarkdown } from "@/lib/markdown";
import { buildAlternates } from "@/lib/seo";

// Fully static: prerendered at build, no DB at runtime.
export const dynamicParams = false;

export async function generateStaticParams() {
  const fixtures = await getAllFixtures().catch(() => []);
  return routing.locales.flatMap((locale) =>
    fixtures.map((f) => ({ locale, slug: f.slug }))
  );
}

const TYPE_ORDER = ["preview", "watchpoints", "prediction", "recap", "tactical"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const fixture = await getFixtureBySlug(slug).catch(() => null);
  if (!fixture) return { title: "Pertandingan" };
  const title = `${fixture.home.name} vs ${fixture.away.name}`;
  return {
    title,
    description: `${title} — World Cup 2026 preview, prediction & analysis.`,
    alternates: buildAlternates(
      { pathname: "/pertandingan/[slug]", params: { slug } },
      locale
    ),
    openGraph: { type: "article", title, images: ["/og.png"] },
    twitter: { card: "summary_large_image", images: ["/og.png"] },
  };
}

function formatKickoff(d: Date | null): string {
  if (!d) return "TBD";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("match");

  const fixture = await getFixtureBySlug(slug).catch(() => null);
  if (!fixture) notFound();

  const articles = await getArticlesForFixture(fixture.id, locale).catch(() => []);
  const byType = new Map(articles.map((a) => [a.type, a]));
  const finished = fixture.status === "finished";

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${fixture.home.name} vs ${fixture.away.name}`,
    sport: "Soccer",
    ...(fixture.kickoffAt ? { startDate: fixture.kickoffAt.toISOString() } : {}),
    eventStatus: finished
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventScheduled",
    ...(fixture.venue
      ? { location: { "@type": "Place", name: fixture.venue, address: fixture.city ?? undefined } }
      : {}),
    competitor: [
      { "@type": "SportsTeam", name: fixture.home.name },
      { "@type": "SportsTeam", name: fixture.away.name },
    ],
    superEvent: { "@type": "SportsEvent", name: "FIFA World Cup 2026" },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <JsonLd data={eventLd} />
      {/* Score header */}
      <header className="rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] p-6 text-white">
        <p className="text-center text-sm text-white/80">
          {fixture.groupName ?? fixture.round} &middot; {formatKickoff(fixture.kickoffAt)} WIB
        </p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <TeamBadge name={fixture.home.name} logo={fixture.home.logo} code={fixture.home.code} size={48} showName={false} />
            <span className="text-center text-sm font-medium">{fixture.home.name}</span>
          </div>
          <div className="text-center text-3xl font-bold tabular-nums">
            {finished ? `${fixture.homeGoals ?? 0} - ${fixture.awayGoals ?? 0}` : "VS"}
          </div>
          <div className="flex flex-col items-center gap-2">
            <TeamBadge name={fixture.away.name} logo={fixture.away.logo} code={fixture.away.code} size={48} showName={false} />
            <span className="text-center text-sm font-medium">{fixture.away.name}</span>
          </div>
        </div>
        {fixture.venue && (
          <p className="mt-4 text-center text-xs text-white/70">
            {fixture.venue}{fixture.city ? `, ${fixture.city}` : ""}
          </p>
        )}
      </header>

      {/* Articles by type */}
      {TYPE_ORDER.map((type) => {
        const article = byType.get(type);
        if (!article) return null;
        return (
          <article key={type} className="space-y-3">
            <h2 className="text-xl font-bold">{t(type as never)}</h2>
            <div
              className="prose-skorly"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
            />
          </article>
        );
      })}

      {!articles.length && (
        <p className="text-[var(--muted)]">
          Analisis untuk pertandingan ini sedang disiapkan.
        </p>
      )}

      <SubscribeGiftCard source="match_page" />
    </div>
  );
}
