import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Countdown } from "@/components/countdown";
import { MatchCard } from "@/components/match-card";
import { ArticleCard } from "@/components/article-card";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";
import { HomePersonalized } from "@/components/home-personalized";
import { buildCanonicalMetadata, pageSeoDescription, pageSeoTitle } from "@/lib/seo";
import {
  getRuntimeLatestArticles,
  getRuntimeLeaderboard,
  getRuntimeUpcomingFixtures,
} from "@/lib/runtime-data";

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

  const [fixtures, articles, leaders] = await Promise.all([
    getRuntimeUpcomingFixtures(6).catch(() => []),
    getRuntimeLatestArticles(locale, 6).catch(() => []),
    getRuntimeLeaderboard(5).catch(() => []),
  ]);
  const nextMatch = fixtures[0] ?? null;

  return (
    <div>
      {/* Compact hero: predict-first CTAs, smaller countdown */}
      <section className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] py-7">
        <div className="mx-auto max-w-5xl px-4 text-center text-white">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("heroTitle")}</h1>
          <p className="mt-1 text-sm text-white/85">{t("heroSubtitle")}</p>
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
          <div className="mt-5">
            <Countdown label={t("countdown")} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
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
                  <MatchCard key={f.id} fixture={f} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Jadwal segera hadir.</p>
            )}
          </section>

          {/* Premium prediction plan teaser */}
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

          <SubscribeGiftCard source="homepage" />
        </aside>
      </div>
    </div>
  );
}
