import { INDEXABLE_LOCALES } from "@/i18n/locales";
import { ARTICLE_AUTHOR_SLUG } from "@/lib/article-author";
import { absoluteUrl, buildLanguageAlternates, localizedPath } from "@/lib/seo";
import type { ArticleSitemapEntry } from "@skorly/db";

type Href = Parameters<typeof localizedPath>[0];

type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface SitemapUrlEntry {
  url: string;
  lastModified?: Date | null;
  changeFrequency?: ChangeFrequency;
  priority?: number;
  alternates?: Record<string, string>;
}

export interface SitemapIndexEntry {
  url: string;
  lastModified?: Date | null;
}

export const SITEMAP_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export const SITEMAP_INDEX_PATHS = [
  "/sitemaps/static.xml",
  "/sitemaps/groups.xml",
  "/sitemaps/teams.xml",
  "/sitemaps/matches.xml",
  "/sitemaps/stories.xml",
  "/sitemaps/articles.xml",
  "/news-sitemap.xml",
] as const;

export function sitemapXmlResponse(xml: string, cacheControl = SITEMAP_CACHE_CONTROL): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sitemapUrl(value: string): string {
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}

function lastmod(date: Date | null | undefined): string {
  return date ? `<lastmod>${date.toISOString()}</lastmod>` : "";
}

export function buildSitemapIndexXml(entries: SitemapIndexEntry[]): string {
  const items = entries
    .map(
      (entry) => `<sitemap>
<loc>${xmlEscape(sitemapUrl(entry.url))}</loc>
${lastmod(entry.lastModified)}
</sitemap>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

export function buildSitemapXml(entries: SitemapUrlEntry[]): string {
  const hasAlternates = entries.some((entry) => entry.alternates && Object.keys(entry.alternates).length > 0);
  const xmlns = hasAlternates
    ? ` xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"`
    : ` xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;

  const items = entries
    .map((entry) => {
      const alternates = Object.entries(entry.alternates ?? {})
        .map(
          ([hreflang, href]) =>
            `<xhtml:link rel="alternate" hreflang="${xmlEscape(hreflang)}" href="${xmlEscape(
              sitemapUrl(href),
            )}" />`,
        )
        .join("\n");
      return `<url>
<loc>${xmlEscape(sitemapUrl(entry.url))}</loc>
${alternates}
${lastmod(entry.lastModified)}
${entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : ""}
${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ""}
</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset${xmlns}>
${items}
</urlset>
`;
}

export function sitemapIndexEntries(generatedAt = new Date()): SitemapIndexEntry[] {
  return SITEMAP_INDEX_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: generatedAt,
  }));
}

export function withAlternates(
  href: Href,
  lastModified?: Date,
  opts?: { changeFrequency?: ChangeFrequency; priority?: number },
): SitemapUrlEntry[] {
  const languages = buildLanguageAlternates(href);

  return INDEXABLE_LOCALES.map((locale) => ({
    url: absoluteUrl(localizedPath(href, locale)),
    lastModified,
    changeFrequency: opts?.changeFrequency,
    priority: opts?.priority,
    alternates: languages,
  }));
}

export function staticSitemapEntries(generatedAt = new Date()): SitemapUrlEntry[] {
  const entries: SitemapUrlEntry[] = [];
  entries.push(...withAlternates("/", generatedAt, { changeFrequency: "daily", priority: 1 }));
  entries.push(...withAlternates("/piala-dunia-2026", generatedAt, { changeFrequency: "daily", priority: 0.9 }));
  entries.push(...withAlternates("/berita", generatedAt, { changeFrequency: "daily", priority: 0.8 }));
  entries.push(...withAlternates("/arsip", generatedAt, { changeFrequency: "daily", priority: 0.7 }));
  entries.push(...withAlternates("/skor", generatedAt, { changeFrequency: "hourly", priority: 0.9 }));
  entries.push(...withAlternates("/jadwal", generatedAt, { changeFrequency: "daily", priority: 0.8 }));
  entries.push(...withAlternates("/tim", generatedAt, { changeFrequency: "weekly", priority: 0.7 }));
  entries.push(...withAlternates("/peringkat", generatedAt, { changeFrequency: "daily", priority: 0.6 }));
  entries.push(...withAlternates("/prediksi", generatedAt, { changeFrequency: "weekly", priority: 0.6 }));
  entries.push(...withAlternates("/cerita", generatedAt, { changeFrequency: "daily", priority: 0.6 }));
  entries.push(...withAlternates("/nonton", generatedAt, { changeFrequency: "weekly", priority: 0.6 }));
  entries.push(...withAlternates("/iklan", generatedAt, { changeFrequency: "monthly", priority: 0.3 }));
  entries.push(
    ...withAlternates(
      { pathname: "/author/[slug]", params: { slug: ARTICLE_AUTHOR_SLUG } },
      generatedAt,
      { changeFrequency: "monthly", priority: 0.5 },
    ),
  );
  return entries;
}

export function groupSitemapEntries(groups: string[], generatedAt = new Date()): SitemapUrlEntry[] {
  return groups.flatMap((groupName) => {
    const group = groupName.replace("Group ", "").toLowerCase();
    return withAlternates(
      { pathname: "/piala-dunia-2026/grup/[group]", params: { group } },
      generatedAt,
      { changeFrequency: "daily", priority: 0.7 },
    );
  });
}

export function teamSitemapEntries(teamSlugs: string[], generatedAt = new Date()): SitemapUrlEntry[] {
  return teamSlugs.flatMap((slug) =>
    withAlternates(
      { pathname: "/tim/[slug]", params: { slug } },
      generatedAt,
      { changeFrequency: "weekly", priority: 0.6 },
    ),
  );
}

export function matchSitemapEntries(fixtures: { slug: string }[], generatedAt = new Date()): SitemapUrlEntry[] {
  return fixtures.flatMap((fixture) =>
    withAlternates(
      { pathname: "/pertandingan/[slug]", params: { slug: fixture.slug } },
      generatedAt,
      { changeFrequency: "daily", priority: 0.6 },
    ),
  );
}

export function storySitemapEntries(fixtures: { slug: string }[], generatedAt = new Date()): SitemapUrlEntry[] {
  return fixtures.flatMap((fixture) =>
    withAlternates(
      { pathname: "/cerita/[slug]", params: { slug: fixture.slug } },
      generatedAt,
      { changeFrequency: "daily", priority: 0.5 },
    ),
  );
}

function articleLocalesBySlug(articles: { slug: string; locale: string }[]) {
  const bySlug = new Map<string, Set<string>>();
  for (const article of articles) {
    const locales = bySlug.get(article.slug) ?? new Set<string>();
    locales.add(article.locale);
    bySlug.set(article.slug, locales);
  }
  return new Map(
    [...bySlug.entries()].map(([slug, locales]) => [
      slug,
      INDEXABLE_LOCALES.filter((locale) => locales.has(locale)),
    ]),
  );
}

export function articleSitemapEntries(articles: ArticleSitemapEntry[]): SitemapUrlEntry[] {
  const localesBySlug = articleLocalesBySlug(articles);
  const entries: SitemapUrlEntry[] = [];
  for (const article of articles) {
    if (!INDEXABLE_LOCALES.some((locale) => locale === article.locale)) continue;
    const href = { pathname: "/artikel/[slug]", params: { slug: article.slug } } as const;
    const locales = localesBySlug.get(article.slug) ?? [article.locale];
    entries.push({
      url: absoluteUrl(localizedPath(href, article.locale)),
      lastModified: article.updatedAt ?? article.publishedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: buildLanguageAlternates(href, locales),
    });
  }
  return entries;
}
