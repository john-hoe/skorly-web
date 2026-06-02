import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLatestNews } from "@skorly/db";
import { ArticleCard } from "@/components/article-card";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("nav.news"),
    description: `${t("nav.news")} — ${t("site.tagline")}`,
    alternates: buildAlternates("/berita", locale),
  };
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const news = await getLatestNews(locale, 40).catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.news")}</h1>
      {news.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">{t("common.loading")}</p>
      )}
    </div>
  );
}
