import { getNewsSitemapEntries, type ArticleSitemapEntry } from "@skorly/db";
import { absoluteUrl, localizedPath, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NEWS_LANG: Record<string, string> = { id: "id", vi: "vi", en: "en", zh: "zh-cn" };
const NEWS_WINDOW_MS = 1000 * 60 * 60 * 48;
let lastGoodArticles: ArticleSitemapEntry[] | null = null;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Google News sitemap. Per spec, only articles published in the last 48h are
 * valid; older ones are ignored by Google. This must be request-time filtered
 * because a build-time snapshot goes stale even when the XML route is cached
 * correctly.
 */
export async function GET() {
  const cutoff = new Date(Date.now() - NEWS_WINDOW_MS);
  let articles: ArticleSitemapEntry[];
  let source = "database";

  try {
    articles = await getNewsSitemapEntries(cutoff);
    lastGoodArticles = articles;
  } catch (error) {
    console.warn("[news-sitemap] query failed", error);
    if (!lastGoodArticles) {
      return new Response("News sitemap temporarily unavailable", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    articles = lastGoodArticles;
    source = "memory-fallback";
  }

  const items = articles
    .filter((a) => a.publishedAt && a.publishedAt >= cutoff)
    .map((a) => {
      const loc = absoluteUrl(
        localizedPath({ pathname: "/artikel/[slug]", params: { slug: a.slug } }, a.locale)
      );
      return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(SITE_NAME)}</news:name>
        <news:language>${NEWS_LANG[a.locale] ?? "en"}</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt!.toISOString()}</news:publication_date>
      <news:title>${xmlEscape(a.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
      "X-Skorly-News-Sitemap-Source": source,
    },
  });
}
