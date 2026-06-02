import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArticleCards } from "@skorly/db";
import { ArticleGrid } from "@/components/article-grid";
import { buildAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("nav.articles"),
    description: `${t("nav.articles")} — ${t("site.tagline")}`,
    alternates: buildAlternates("/arsip", locale),
  };
}

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const articles = await getArticleCards(locale).catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.articles")}</h1>
      {articles.length ? (
        <ArticleGrid articles={articles} loadMoreLabel={t("common.loadMore")} />
      ) : (
        <p className="text-sm text-[var(--muted)]">{t("common.loading")}</p>
      )}
    </div>
  );
}
