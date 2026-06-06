import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArticleBySlug, getAllArticleSlugs, getArticleSitemapEntries } from "@skorly/db";
import { routing } from "@/i18n/routing";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";
import { SocialEmbed } from "@/components/social-embed";
import { CommentsSection } from "@/components/comments-section";
import { JsonLd } from "@/components/json-ld";
import { ShareButtons } from "@/components/share-buttons";
import { renderMarkdown } from "@/lib/markdown";
import {
  SITE_NAME,
  SITE_LOGO_URL,
  absoluteUrl,
  buildCanonicalMetadata,
  fitMetaDescription,
  fitMetaTitle,
  localizedPath,
  pageSeoDescription,
} from "@/lib/seo";

type Article = Awaited<ReturnType<typeof getArticleBySlug>>;

const articleCache = new Map<string, Promise<Article>>();
let articleLocalesBySlugCache: Promise<Map<string, string[]>> | undefined;

function getArticleForPage(slug: string, locale: string): Promise<Article> {
  const key = `${locale}:${slug}`;
  let cached = articleCache.get(key);
  if (!cached) {
    cached = getArticleBySlug(slug, locale).catch(() => null);
    articleCache.set(key, cached);
  }
  return cached;
}

function getArticleLocalesBySlugMap(): Promise<Map<string, string[]>> {
  if (!articleLocalesBySlugCache) {
    articleLocalesBySlugCache = getArticleSitemapEntries()
      .then((entries) => {
        const bySlug = new Map<string, Set<string>>();
        for (const entry of entries) {
          const locales = bySlug.get(entry.slug) ?? new Set<string>();
          locales.add(entry.locale);
          bySlug.set(entry.slug, locales);
        }
        return new Map(
          [...bySlug.entries()].map(([entrySlug, locales]) => [
            entrySlug,
            routing.locales.filter((locale) => locales.has(locale)),
          ])
        );
      })
      .catch(() => new Map());
  }
  return articleLocalesBySlugCache;
}

async function getArticleLocalesForPage(slug: string): Promise<string[]> {
  return (await getArticleLocalesBySlugMap()).get(slug) ?? [];
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isPublicSource(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
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
  const [article, availableLocales] = await Promise.all([
    getArticleForPage(slug, locale),
    getArticleLocalesForPage(slug),
  ]);
  if (!article) return { title: "Artikel" };
  const title = fitMetaTitle(article.title);
  const description = fitMetaDescription(
    article.summary ?? article.body,
    pageSeoDescription(locale, "articles"),
    140,
    article.title
  );
  const alternateLocales = availableLocales.includes(locale)
    ? availableLocales
    : [locale];
  const canonicalMetadata = buildCanonicalMetadata(
    { pathname: "/artikel/[slug]", params: { slug } },
    locale,
    alternateLocales
  );
  return {
    title,
    description,
    ...canonicalMetadata,
    openGraph: {
      ...canonicalMetadata.openGraph,
      type: "article",
      title,
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
  const sources = Array.isArray(article.sources) ? article.sources.filter(isPublicSource) : [];

  const articlePath = localizedPath({ pathname: "/artikel/[slug]", params: { slug } }, locale);
  const url = absoluteUrl(articlePath);
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
      logo: { "@type": "ImageObject", url: SITE_LOGO_URL },
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

      <ShareButtons url={articlePath} text={`${article.title} | ${SITE_NAME}`} />

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
