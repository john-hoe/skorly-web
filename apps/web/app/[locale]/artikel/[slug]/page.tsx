import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArticleBySlug, getAllArticleSlugs } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";
import { SocialEmbed } from "@/components/social-embed";
import { CommentsSection } from "@/components/comments-section";
import { JsonLd } from "@/components/json-ld";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_NAME, buildAlternates, absoluteUrl, localizedPath } from "@/lib/seo";

type Article = Awaited<ReturnType<typeof getArticleBySlug>>;

const articleCache = new Map<string, Promise<Article>>();

function getArticleForPage(slug: string, locale: string): Promise<Article> {
  const key = `${locale}:${slug}`;
  let cached = articleCache.get(key);
  if (!cached) {
    cached = getArticleBySlug(slug, locale).catch(() => null);
    articleCache.set(key, cached);
  }
  return cached;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Fully static for SEO and OpenNext/Cloudflare stability. Article DB reads are
// deduped in-process so metadata and page rendering share the same build query.
export const dynamicParams = false;

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const slugs = await getAllArticleSlugs(locale).catch(() => []);
    for (const slug of slugs) params.push({ locale, slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const article = await getArticleForPage(slug, locale);
  if (!article) return { title: "Artikel" };
  const description =
    article.summary ?? article.body.replace(/[#*_>`]/g, "").slice(0, 160).trim();
  return {
    title: article.title,
    description,
    alternates: buildAlternates(
      { pathname: "/artikel/[slug]", params: { slug } },
      locale
    ),
    openGraph: {
      type: "article",
      title: article.title,
      description,
      publishedTime: article.publishedAt?.toISOString(),
      images: [article.imageUrl ?? "/og.png"],
    },
    twitter: { card: "summary_large_image", images: [article.imageUrl ?? "/og.png"] },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const tNav = await getTranslations("nav");

  const article = await getArticleForPage(slug, locale);
  if (!article || article.status !== "published") notFound();

  const embeds = Array.isArray(article.embeds) ? article.embeds : [];
  const sources = Array.isArray(article.sources) ? article.sources : [];

  const url = absoluteUrl(localizedPath({ pathname: "/artikel/[slug]", params: { slug } }, locale));
  const newsLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    ...(article.imageUrl ? { image: [absoluteUrl(article.imageUrl)] } : {}),
    inLanguage: locale,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.publishedAt?.toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/og.png") },
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl(localizedPath("/", locale)) },
      { "@type": "ListItem", position: 2, name: tNav("news"), item: absoluteUrl(localizedPath("/berita", locale)) },
      { "@type": "ListItem", position: 3, name: article.title },
    ],
  };

  return (
    <article className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <JsonLd data={[newsLd, breadcrumbLd]} />
      <h1 className="text-3xl font-bold leading-tight">{article.title}</h1>
      {article.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={article.imageUrl}
          alt=""
          className="aspect-[16/9] w-full rounded-xl border border-[var(--border)] object-cover"
        />
      )}
      <div
        className="prose-skorly"
        dangerouslySetInnerHTML={{
          __html: renderMarkdown(article.body, {
            headingOffset: 1,
            stripLeadingH1: true,
          }),
        }}
      />

      {embeds.length > 0 && (
        <section aria-label="media">
          {embeds.map((u) => (
            <SocialEmbed key={u} url={u} />
          ))}
        </section>
      )}

      {sources.length > 0 && (
        <section className="border-t border-[var(--border)] pt-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">
            {t("sources")}
          </h2>
          <ul className="space-y-1 text-sm">
            {sources.map((u) => (
              <li key={u}>
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[var(--brand)] hover:underline break-all"
                >
                  {hostOf(u)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SubscribeGiftCard source="article_page" />

      <CommentsSection target={{ articleId: article.id }} />
    </article>
  );
}
