import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArticleCards } from "@skorly/db";
import { ArticleGrid } from "@/components/article-grid";
import { buildAlternates, pageSeoDescription } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: `${t("nav.news")} — ${t("nav.worldCup")}`,
    description: pageSeoDescription(locale, "news"),
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

  const news = await getArticleCards(locale, { type: "news" }).catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.news")}</h1>
      {news.length ? (
        <ArticleGrid articles={news} loadMoreLabel={t("common.loadMore")} />
      ) : (
        <p className="text-sm text-[var(--muted)]">{t("common.loading")}</p>
      )}
    </div>
  );
}
