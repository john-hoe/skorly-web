import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getArticleBySlug } from "@skorly/db";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";
import { renderMarkdown } from "@/lib/markdown";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const article = await getArticleBySlug(slug, locale).catch(() => null);
  if (!article) return { title: "Artikel" };
  return { title: article.title, description: article.summary ?? undefined };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = await getArticleBySlug(slug, locale).catch(() => null);
  if (!article || article.status !== "published") notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div
        className="prose-skorly"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }}
      />
      <SubscribeGiftCard source="article_page" />
    </article>
  );
}
