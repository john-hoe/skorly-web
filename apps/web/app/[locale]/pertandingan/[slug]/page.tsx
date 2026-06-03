import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFixtureBySlug, getArticlesForFixture, getAllFixtures, getHeadToHead, getFixturePoster } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { TeamBadge } from "@/components/team-badge";
import { PredictScore } from "@/components/predict-score";
import { ForecastCard } from "@/components/forecast-card";
import { PremiumContent } from "@/components/premium-content";
import { PublicPicks } from "@/components/public-picks";
import { CommentsSection } from "@/components/comments-section";
import { EventsTimeline } from "@/components/events-timeline";
import { GoalHighlights } from "@/components/goal-highlights";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";
import { JsonLd } from "@/components/json-ld";
import { buildFixtureSportsEventLd } from "@/lib/event-structured-data";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_NAME, buildAlternates, absoluteUrl, localizedPath } from "@/lib/seo";

type Fixture = Awaited<ReturnType<typeof getFixtureBySlug>>;
type FixtureList = Awaited<ReturnType<typeof getAllFixtures>>;
type FixtureArticles = Awaited<ReturnType<typeof getArticlesForFixture>>;
type HeadToHead = Awaited<ReturnType<typeof getHeadToHead>>;
type Poster = Awaited<ReturnType<typeof getFixturePoster>>;

let allFixturesPromise: Promise<FixtureList> | undefined;
const fixtureCache = new Map<string, Promise<Fixture>>();
const fixtureArticlesCache = new Map<string, Promise<FixtureArticles>>();
const h2hCache = new Map<string, Promise<HeadToHead>>();
const posterCache = new Map<string, Promise<Poster>>();

function getAllFixturesForBuild(): Promise<FixtureList> {
  allFixturesPromise ??= getAllFixtures().catch(() => []);
  return allFixturesPromise;
}

function getFixtureForPage(slug: string): Promise<Fixture> {
  let cached = fixtureCache.get(slug);
  if (!cached) {
    cached = getFixtureBySlug(slug).catch(() => null);
    fixtureCache.set(slug, cached);
  }
  return cached;
}

function getFixtureArticlesForPage(fixtureId: number, locale: string): Promise<FixtureArticles> {
  const key = `${locale}:${fixtureId}`;
  let cached = fixtureArticlesCache.get(key);
  if (!cached) {
    cached = getArticlesForFixture(fixtureId, locale).catch(() => []);
    fixtureArticlesCache.set(key, cached);
  }
  return cached;
}

function getHeadToHeadForPage(teamA: number, teamB: number): Promise<HeadToHead> {
  const key = [teamA, teamB].sort((a, b) => a - b).join(":");
  let cached = h2hCache.get(key);
  if (!cached) {
    cached = getHeadToHead(teamA, teamB).catch(() => ({
      total: 0,
      homeWins: 0,
      awayWins: 0,
      draws: 0,
      meetings: [],
    }));
    h2hCache.set(key, cached);
  }
  return cached;
}

function getFixturePosterForPage(fixtureId: number, kind: string): Promise<Poster> {
  const key = `${fixtureId}:${kind}`;
  let cached = posterCache.get(key);
  if (!cached) {
    cached = getFixturePoster(fixtureId, kind).catch(() => null);
    posterCache.set(key, cached);
  }
  return cached;
}

// Fully static for SEO and OpenNext/Cloudflare stability. Build-time DB reads
// are cached and optional fixture data is loaded in parallel.
export const dynamicParams = false;

export async function generateStaticParams() {
  const fixtures = await getAllFixturesForBuild();
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
  const fixture = await getFixtureForPage(slug);
  if (!fixture) return { title: "Pertandingan" };
  const title = `${fixture.home.name} vs ${fixture.away.name}`;
  const finished = fixture.status === "finished";
  const sub = finished
    ? `${fixture.homeGoals ?? 0} - ${fixture.awayGoals ?? 0}`
    : formatKickoff(fixture.kickoffAt) + " WIB";
  const ogImage = absoluteUrl(
    `/og?kind=match&t=${encodeURIComponent(title)}&s=${encodeURIComponent(sub)}`
  );
  return {
    title,
    description: `${title} — World Cup 2026 preview, prediction & analysis.`,
    alternates: buildAlternates(
      { pathname: "/pertandingan/[slug]", params: { slug } },
      locale
    ),
    openGraph: { type: "article", title, images: [ogImage] },
    twitter: { card: "summary_large_image", images: [ogImage] },
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

  const fixture = await getFixtureForPage(slug);
  if (!fixture) notFound();

  const articlesPromise = getFixtureArticlesForPage(fixture.id, locale);
  const h2hPromise =
    fixture.home.id != null && fixture.away.id != null
      ? getHeadToHeadForPage(fixture.home.id, fixture.away.id)
      : Promise.resolve(null);
  const posterPromise = getFixturePosterForPage(
    fixture.id,
    fixture.status === "finished" ? "result_card" : "prematch_poster"
  );
  const [articles, h2h, poster] = await Promise.all([
    articlesPromise,
    h2hPromise,
    posterPromise,
  ]);
  const byType = new Map(articles.map((a) => [a.type, a]));
  const finished = fixture.status === "finished";
  const matchTitle = `${fixture.home.name} vs ${fixture.away.name}`;
  const eventImage = poster?.url
    ? absoluteUrl(poster.url)
    : absoluteUrl(
        `/og?kind=match&t=${encodeURIComponent(matchTitle)}&s=${encodeURIComponent(
          finished
            ? `${fixture.homeGoals ?? 0} - ${fixture.awayGoals ?? 0}`
            : `${formatKickoff(fixture.kickoffAt)} WIB`
        )}`
      );

  const eventLd = buildFixtureSportsEventLd({
    fixture,
    url: absoluteUrl(localizedPath({ pathname: "/pertandingan/[slug]", params: { slug } }, locale)),
    image: eventImage,
    description: `${matchTitle} World Cup 2026 match preview, kickoff details, teams, prediction and analysis.`,
  });

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl(localizedPath("/", locale)) },
      {
        "@type": "ListItem",
        position: 2,
        name: "World Cup 2026",
        item: absoluteUrl(localizedPath("/piala-dunia-2026", locale)),
      },
      { "@type": "ListItem", position: 3, name: matchTitle },
    ],
  };

  // FAQ JSON-LD from the prediction article (if any) — strong Discover/News signal.
  const predictionArticle = byType.get("prediction");
  const faqLd = predictionArticle
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `${matchTitle}: ${t("prediction")}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text:
                predictionArticle.summary ??
                predictionArticle.body.replace(/[#*_>`]/g, "").slice(0, 280).trim(),
            },
          },
          ...(fixture.venue
            ? [
                {
                  "@type": "Question",
                  name: `${matchTitle}: ${t("kickoff")}?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `${formatKickoff(fixture.kickoffAt)} WIB — ${fixture.venue}${fixture.city ? `, ${fixture.city}` : ""}.`,
                  },
                },
              ]
            : []),
        ],
      }
    : null;
  const jsonLdData = [eventLd, breadcrumbLd, faqLd].filter(
    (item): item is Record<string, unknown> => Boolean(item)
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <JsonLd data={jsonLdData} />
      {/* Score header */}
      <header className="rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] p-6 text-white">
        <p className="text-center text-sm text-white/80">
          {fixture.groupName ?? fixture.round} &middot; {formatKickoff(fixture.kickoffAt)} WIB
        </p>
        <h1 className="mt-3 text-center text-2xl font-bold leading-tight">
          {matchTitle}
        </h1>
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

      {poster?.url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={poster.url}
          alt={`${fixture.home.name} vs ${fixture.away.name}`}
          className="w-full rounded-2xl border border-[var(--border)] object-cover"
        />
      )}

      {/* Predict & win + statistical forecast (client islands — keep this
          page statically cached while showing live data). */}
      <div className="grid gap-4 md:grid-cols-2">
        <PredictScore
          fixtureId={fixture.id}
          status={fixture.status}
          kickoffAt={fixture.kickoffAt ? fixture.kickoffAt.toISOString() : null}
          homeName={fixture.home.name}
          awayName={fixture.away.name}
          homeGoals={fixture.homeGoals}
          awayGoals={fixture.awayGoals}
          sharePath={localizedPath({ pathname: "/pertandingan/[slug]", params: { slug } }, locale)}
        />
        <ForecastCard fixtureId={fixture.id} />
      </div>

      {/* Minute-level events (live + post-match), client island */}
      <EventsTimeline fixtureId={fixture.id} />

      {/* Goal highlights (finished matches): goals-only timeline + official
          video embeds from the recap article. No self-hosted clips. */}
      {finished && (
        <GoalHighlights
          fixtureId={fixture.id}
          embeds={
            Array.isArray(byType.get("recap")?.embeds)
              ? (byType.get("recap")!.embeds as string[])
              : []
          }
        />
      )}

      {/* Head-to-head record */}
      {h2h && h2h.total > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("headToHead")}</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
              <p className="text-2xl font-bold tabular-nums">{h2h.homeWins}</p>
              <p className="truncate text-xs text-[var(--muted)]">{fixture.home.name}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
              <p className="text-2xl font-bold tabular-nums">{h2h.draws}</p>
              <p className="text-xs text-[var(--muted)]">{t("draws")}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
              <p className="text-2xl font-bold tabular-nums">{h2h.awayWins}</p>
              <p className="truncate text-xs text-[var(--muted)]">{fixture.away.name}</p>
            </div>
          </div>
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm">
            {h2h.meetings.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2">
                <span className="truncate">
                  {m.home.name} <span className="font-bold tabular-nums">{m.homeGoals ?? 0}-{m.awayGoals ?? 0}</span> {m.away.name}
                </span>
                <span className="shrink-0 pl-2 text-xs text-[var(--muted)]">
                  {m.kickoffAt ? m.kickoffAt.getFullYear() : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Articles by type. The prediction plan is tiered: free preview is
          server-rendered (SEO), the full deep-dive unlocks for members. */}
      {TYPE_ORDER.map((type) => {
        const article = byType.get(type);
        if (!article) return null;
        const previewMd =
          article.summary && article.summary.trim().length > 0
            ? article.summary
            : article.body.slice(0, 600);
        return (
          <article key={type} className="space-y-3">
            <h2 className="text-xl font-bold">{t(type as never)}</h2>
            {type === "prediction" ? (
              <PremiumContent
                fixtureId={fixture.id}
                previewHtml={renderMarkdown(previewMd, { headingOffset: 2 })}
              />
            ) : (
              <div
                className="prose-skorly"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(article.body, { headingOffset: 2 }),
                }}
              />
            )}
          </article>
        );
      })}

      {!articles.length && (
        <p className="text-[var(--muted)]">
          Analisis untuk pertandingan ini sedang disiapkan.
        </p>
      )}

      {/* Structured "show your prediction" — community picks for this fixture */}
      <PublicPicks fixtureId={fixture.id} />

      <SubscribeGiftCard source="match_page" />

      {/* Comments (client island — keeps the page statically cached) */}
      <CommentsSection target={{ fixtureId: fixture.id }} />
    </div>
  );
}
