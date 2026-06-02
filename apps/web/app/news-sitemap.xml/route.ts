import { getArticleSitemapEntries } from "@skorly/db";
import { absoluteUrl, localizedPath, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-static";

const NEWS_LANG: Record<string, string> = { id: "id", vi: "vi", en: "en", zh: "zh-cn" };

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Google News sitemap. Per spec, only articles published in the last 48h are
 * valid; older ones are ignored by Google. Keep the cache short so Google can
 * re-read a newly deployed sitemap quickly during the tournament.
 */
export async function GET() {
  const articles = await getArticleSitemapEntries().catch(() => []);
  const cutoff = Date.now() - 1000 * 60 * 60 * 48;

  const items = articles
    .filter((a) => a.publishedAt && a.publishedAt.getTime() >= cutoff)
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
    },
  });
}
