import { getNewsSitemapEntries } from "@skorly/db";
import { absoluteUrl, localizedPath, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NEWS_LANG: Record<string, string> = { id: "id", vi: "vi", en: "en", zh: "zh-cn" };
const NEWS_WINDOW_MS = 1000 * 60 * 60 * 48;
const NEWS_SITEMAP_TIMEOUT_MS = 8_000;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function withTimeout<T>(work: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), NEWS_SITEMAP_TIMEOUT_MS);
    if (timer && typeof timer === "object" && "unref" in timer) timer.unref();
  });

  try {
    return await Promise.race([
      work.catch((error) => {
        console.warn("[news-sitemap] query failed", error);
        return fallback;
      }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Google News sitemap. Per spec, only articles published in the last 48h are
 * valid; older ones are ignored by Google. This must be request-time filtered
 * because a build-time snapshot goes stale even when the XML route is cached
 * correctly.
 */
export async function GET() {
  const cutoff = new Date(Date.now() - NEWS_WINDOW_MS);
  const articles = await withTimeout(getNewsSitemapEntries(cutoff), []);

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
    },
  });
}
