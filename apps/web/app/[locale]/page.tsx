import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Countdown } from "@/components/countdown";
import { LiveNowBanner } from "@/components/live-now-banner";
import { MatchCard } from "@/components/match-card";
import { ArticleCard } from "@/components/article-card";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";
import { HomePersonalized } from "@/components/home-personalized";
import { buildCanonicalMetadata, pageSeoDescription, pageSeoTitle } from "@/lib/seo";
import { formatKickoffTime } from "@/lib/kickoff-time";
import { FocusMatchHero, type FocusMatchData } from "@/components/focus-match-hero";
import { HomeLiveSection, type HomeLiveMatch } from "@/components/home-live-section";
import {
  getRuntimeFixturePredictionCount,
  getRuntimeLatestArticles,
  getRuntimeLeaderboard,
  getRuntimeMatchForecast,
  getRuntimePredictionTotal,
  getRuntimeResultsFixtures,
  getRuntimeUpcomingFixtures,
} from "@/lib/runtime-data";

const TOURNAMENT_KICKOFF = new Date("2026-06-11T19:00:00Z").getTime();

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: pageSeoTitle(locale, "home"),
    description: pageSeoDescription(locale, "home"),
    ...buildCanonicalMetadata("/", locale),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  const [allFixtures, results, articles, leaderboard] = await Promise.all([
    getRuntimeUpcomingFixtures(12).catch(() => []),
    getRuntimeResultsFixtures(4).catch(() => []),
    getRuntimeLatestArticles(locale, 6).catch(() => []),
    getRuntimeLeaderboard(50).catch(() => []),
  ]);
  const leaders = leaderboard.slice(0, 5);
  const aiLeaders = leaderboard.filter((l) => (l.displayName ?? "").startsWith("Skorly AI"));
  // The 3h lookback window keeps live/finished games in "upcoming"; only show
  // genuinely future matches here (live ones surface in the top banner).
  const fixtures = allFixtures.filter((f) => f.status === "scheduled").slice(0, 6);
  const liveFixtures = allFixtures.filter((f) => f.status === "live");
  // Focus carousel: every live game (simultaneous kickoffs are swipeable),
  // otherwise the next scheduled match alone.
  const focusFixtures = liveFixtures.length ? liveFixtures.slice(0, 3) : fixtures.slice(0, 1);
  const nextMatch = fixtures[0] ?? null;
  // Build-time evaluation is intended: the page is statically generated and
  // rebuilt at least every 30 minutes on match days.
  // eslint-disable-next-line react-hooks/purity
  const tournamentLive = Date.now() >= TOURNAMENT_KICKOFF;

  const focusMatches: FocusMatchData[] = await Promise.all(
    focusFixtures.map(async (f) => {
      const [forecast, picksCount] = await Promise.all([
        getRuntimeMatchForecast(f.id).catch(() => null),
        getRuntimeFixturePredictionCount(f.id).catch(() => 0),
      ]);
      return {
        id: f.id,
        slug: f.slug,
        kickoffAt: f.kickoffAt ? new Date(f.kickoffAt).toISOString() : null,
        groupName: f.groupName ?? f.round,
        status: f.status,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        elapsed: f.elapsed,
        home: { name: f.home.name, logo: f.home.logo, code: f.home.code },
        away: { name: f.away.name, logo: f.away.logo, code: f.away.code },
        aiName: "Skorly AI · Elo",
        aiHome: forecast?.forecast.mostLikelyScore.home ?? 1,
        aiAway: forecast?.forecast.mostLikelyScore.away ?? 1,
        picksCount,
      };
    }),
  );

  const initialLive: HomeLiveMatch[] = liveFixtures.map((f) => ({
    id: f.id,
    slug: f.slug,
    homeName: f.home.name,
    awayName: f.away.name,
    homeGoals: f.homeGoals,
    awayGoals: f.awayGoals,
    elapsed: f.elapsed,
  }));

  // "Today's picks" strip: daypart-aware cards built entirely from data
  // already on the page (no extra queries).
  type StripItem = {
    key: string;
    badge: string;
    accent: string;
    title: string;
    sub: string | null;
    slug?: string;
    articleSlug?: string;
  };
  const strip: StripItem[] = [
    ...liveFixtures.map((f) => ({
      key: `live-${f.id}`,
      badge: "LIVE",
      accent: "text-red-500",
      title: `${f.home.name} ${f.homeGoals ?? 0}-${f.awayGoals ?? 0} ${f.away.name}`,
      sub: f.elapsed != null ? `${f.elapsed}'` : null,
      slug: f.slug,
    })),
    ...fixtures.slice(0, 3).map((f) => ({
      key: `up-${f.id}`,
      badge: t("stripUpcoming"),
      accent: "text-[var(--brand)]",
      title: `${f.home.name} vs ${f.away.name}`,
      sub: formatKickoffTime(f.kickoffAt, locale, "compact"),
      slug: f.slug,
    })),
    ...results.slice(0, 2).map((f) => ({
      key: `res-${f.id}`,
      badge: t("stripResult"),
      accent: "text-slate-500",
      title: `${f.home.name} ${f.homeGoals ?? 0}-${f.awayGoals ?? 0} ${f.away.name}`,
      sub: null,
      slug: f.slug,
    })),
    ...articles.slice(0, 2).map((a) => ({
      key: `art-${a.id}`,
      badge: t("stripArticle"),
      accent: "text-sky-600",
      title: a.title,
      sub: null,
      articleSlug: a.slug,
    })),
  ].slice(0, 8);

  // eslint-disable-next-line react-hooks/purity -- build-time evaluation (see above)
  const nowMs = Date.now();
  const next24hCount = allFixtures.filter((f) => {
    if (!f.kickoffAt) return false;
    const t = new Date(f.kickoffAt).getTime();
    return t > nowMs - 2 * 60 * 60 * 1000 && t < nowMs + 24 * 60 * 60 * 1000;
  }).length;
  const predictionTotal = await getRuntimePredictionTotal().catch(() => 0);
  const topLeader = leaders[0]?.displayName ?? null;

  return (
    <div>
      {/* Live-now strip: first thing a visitor sees on match days */}
      <LiveNowBanner
        next={
          nextMatch
            ? {
                slug: nextMatch.slug,
                kickoffAt: nextMatch.kickoffAt ? new Date(nextMatch.kickoffAt).toISOString() : null,
                homeName: nextMatch.home.name,
                awayName: nextMatch.away.name,
              }
            : null
        }
      />
      {/* Compact hero: predict-first CTAs, smaller countdown */}
      <section className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] py-7">
        <div className="mx-auto max-w-5xl px-4 text-center text-white">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("heroTitle")}</h1>
          <p className="mt-1 text-sm text-white/85">{t("heroSubtitle")}</p>
          {focusMatches.length ? (
            <FocusMatchHero matches={focusMatches} />
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={
                  nextMatch
                    ? { pathname: "/pertandingan/[slug]", params: { slug: nextMatch.slug } }
                    : "/piala-dunia-2026"
                }
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[var(--brand-dark)] hover:bg-white/90"
              >
                {t("predictCta")}
              </Link>
              <Link
                href="/prediksi"
                className="rounded-lg border border-white/60 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                {t("bracketCta")}
              </Link>
            </div>
          )}
          {focusMatches.length ? (
            <div className="mt-3">
              <Link
                href="/prediksi"
                className="text-sm font-semibold text-white/85 underline-offset-4 hover:underline"
              >
                {t("bracketCta")} →
              </Link>
            </div>
          ) : null}
          {tournamentLive ? (
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-white/85">
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#bbf7d0]" />
                {t("tournamentLive")}
              </span>
              <span aria-hidden>·</span>
              <span>{t("statsMatches24h", { count: next24hCount })}</span>
              {predictionTotal > 0 ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{t("statsPredictions", { count: predictionTotal })}</span>
                </>
              ) : null}
              {topLeader ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{t("statsLeader", { name: topLeader })}</span>
                </>
              ) : null}
            </p>
          ) : (
            <div className="mt-5">
              <Countdown label={t("countdown")} />
            </div>
          )}
        </div>
      </section>

      {/* Today's picks: daypart-aware horizontal strip (user-scrolled, no autoplay) */}
      {strip.length ? (
        <div className="border-b border-[var(--border)] bg-[var(--card)]/40">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              {t("highlightsTitle")}
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {strip.map((item) => (
                <Link
                  key={item.key}
                  href={
                    item.articleSlug
                      ? { pathname: "/artikel/[slug]", params: { slug: item.articleSlug } }
                      : { pathname: "/pertandingan/[slug]", params: { slug: item.slug! } }
                  }
                  className="w-56 shrink-0 snap-start rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 transition hover:border-[var(--brand)]"
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${item.accent}`}>
                    {item.badge}
                    {item.sub ? <span className="ml-1.5 text-[var(--muted)] normal-case">{item.sub}</span> : null}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                    {item.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl px-4 py-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          {/* Live now — match-day top priority in the main column */}
          <HomeLiveSection
            initialLive={initialLive}
            nextKickoffAt={nextMatch?.kickoffAt ? new Date(nextMatch.kickoffAt).toISOString() : null}
          />

          {/* Personalized strip (client island → page stays static) */}
          <HomePersonalized />

          {/* Upcoming matches → tap to predict */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("upcomingMatches")}</h2>
              <Link href="/piala-dunia-2026" className="text-sm text-[var(--brand)]">
                {tCommon("viewAll")}
              </Link>
            </div>
            {fixtures.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {fixtures.map((f) => (
                  <MatchCard key={f.id} fixture={f} locale={locale} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Jadwal segera hadir.</p>
            )}
          </section>

          {/* Latest results → tap through to the recap */}
          {results.length ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t("latestResults")}</h2>
                <Link href="/skor" className="text-sm text-[var(--brand)]">
                  {tCommon("viewAll")}
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {results.map((f) => (
                  <MatchCard key={f.id} fixture={f} locale={locale} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Latest articles */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("latestArticles")}</h2>
              <Link href="/arsip" className="text-sm text-[var(--brand)]">
                {tCommon("viewAll")}
              </Link>
            </div>
            {articles.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {articles.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Artikel akan tersedia setelah konten dibuat.
              </p>
            )}
          </section>

          {/* Premium prediction plan teaser — after the content that earns it */}
          <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--brand)]/5 p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-xs font-bold text-[var(--brand)]">
                ★ {t("premiumBadge")}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-semibold">{t("premiumTitle")}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("premiumDesc")}</p>
            <Link
              href="/daftar"
              className="mt-3 inline-block rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
            >
              {t("premiumCta")}
            </Link>
          </section>
        </div>

        <aside className="space-y-6">
          {/* Leaderboard snippet */}
          {leaders.length > 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{t("leaderboardTitle")}</h2>
                <Link href="/peringkat" className="text-xs text-[var(--brand)]">
                  {tCommon("viewAll")}
                </Link>
              </div>
              <ol className="space-y-2">
                {leaders.map((l, i) => (
                  <li key={l.userId} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-center font-bold tabular-nums text-[var(--muted)]">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {l.displayName?.trim() || t("anonymousPlayer")}
                    </span>
                    <span className="font-bold tabular-nums text-[var(--brand)]">
                      {l.points}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Skorly AI predictors — can you beat them? */}
          {aiLeaders.length > 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <h2 className="mb-3 font-semibold">{t("aiBlockTitle")}</h2>
              <ol className="space-y-2">
                {aiLeaders.map((l) => (
                  <li key={l.userId} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-white">
                      AI
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {(l.displayName ?? "").replace("Skorly AI · ", "")}
                    </span>
                    <span className="font-bold tabular-nums text-[var(--brand)]">{l.points}</span>
                  </li>
                ))}
              </ol>
              <Link
                href="/peringkat"
                className="mt-3 inline-block w-full rounded-lg border border-[var(--brand)] px-3 py-2 text-center text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
              >
                {t("beatAi")}
              </Link>
            </section>
          )}

          <SubscribeGiftCard source="homepage" />
        </aside>
      </div>
    </div>
  );
}
