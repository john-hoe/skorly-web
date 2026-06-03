import { absoluteUrl, localizedPath, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NEWS_LANG: Record<string, string> = { id: "id", vi: "vi", en: "en", zh: "zh-cn" };
const NEWS_WINDOW_MS = 1000 * 60 * 60 * 48;
const NEWS_SITEMAP_FETCH_TIMEOUT_MS = 6_000;

interface NewsSitemapEntry {
  slug: string;
  locale: string;
  title: string;
  body: string | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
}

interface SupabaseNewsRow {
  slug: string;
  locale: string;
  title: string;
  body: string | null;
  published_at: string | null;
  updated_at: string | null;
}

let lastGoodArticles: NewsSitemapEntry[] | null = null;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeArticleTitle(locale: string, title: string, slug: string, body?: string | null) {
  if (locale !== "id" || !/\bASI\b/.test(title)) return title;
  const context = `${slug} ${body ?? ""}`.toLowerCase();
  if (!/\b(usa|united states|amerika serikat)\b/.test(context)) return title;
  return title.replace(/\bASI\b/g, "Amerika Serikat");
}

async function getNewsSitemapEntries(cutoff: Date): Promise<NewsSitemapEntry[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase REST configuration is not set");
  }

  const url = new URL("/rest/v1/articles", supabaseUrl);
  url.searchParams.set("select", "slug,locale,title,body,published_at,updated_at");
  url.searchParams.set("status", "eq.published");
  url.searchParams.set("type", "eq.news");
  url.searchParams.set("published_at", `gte.${cutoff.toISOString()}`);
  url.searchParams.set("order", "published_at.desc,created_at.desc");
  url.searchParams.set("limit", "1000");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_SITEMAP_FETCH_TIMEOUT_MS);
  if (typeof timer === "object" && "unref" in timer) timer.unref();

  try {
    const res = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Supabase REST query failed with ${res.status}: ${await res.text()}`);
    }
    const rows = (await res.json()) as SupabaseNewsRow[];
    return rows.map((r) => ({
      slug: r.slug,
      locale: r.locale,
      title: normalizeArticleTitle(r.locale, r.title, r.slug, r.body),
      body: r.body,
      publishedAt: safeDate(r.published_at),
      updatedAt: safeDate(r.updated_at),
    }));
  } finally {
    clearTimeout(timer);
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
  let articles: NewsSitemapEntry[];
  let source = "supabase-rest";

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
