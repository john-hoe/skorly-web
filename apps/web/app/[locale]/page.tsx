import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUpcomingFixtures, getLatestArticles } from "@skorly/db";
import { Link } from "@/i18n/navigation";
import { Countdown } from "@/components/countdown";
import { MatchCard } from "@/components/match-card";
import { ArticleCard } from "@/components/article-card";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("heroTitle"),
    description: t("heroSubtitle"),
    alternates: buildAlternates("/", locale),
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

  const [fixtures, articles] = await Promise.all([
    getUpcomingFixtures(6).catch(() => []),
    getLatestArticles(locale, 8).catch(() => []),
  ]);

  return (
    <div>
      {/* Hero + countdown */}
      <section className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] py-10">
        <div className="mx-auto max-w-5xl px-4 text-center text-white">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("heroTitle")}</h1>
          <p className="mt-1 text-white/85">{t("heroSubtitle")}</p>
          <div className="mt-6">
            <Countdown label={t("countdown")} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          {/* Upcoming matches */}
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
          <SubscribeGiftCard source="homepage" />
        </aside>
      </div>
    </div>
  );
}
