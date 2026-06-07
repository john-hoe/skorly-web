import type { MetadataRoute } from "next";
import {
  getGroupNames,
  getArticleSitemapEntries,
  getAllTeamSlugs,
} from "@skorly/db";
import { routing } from "@/i18n/routing";
import { absoluteUrl, buildLanguageAlternates, localizedPath } from "@/lib/seo";
import { getStaticFixturesForBuild } from "@/lib/static-fixtures";

export const dynamic = "force-static";

type Href = Parameters<typeof localizedPath>[0];

/** One sitemap entry per locale URL, each carrying hreflang alternates. */
function withAlternates(
  href: Href,
  lastModified?: Date,
  opts?: { changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]; priority?: number }
): MetadataRoute.Sitemap {
  const languages = buildLanguageAlternates(href);

  return routing.locales.map((locale) => ({
    url: absoluteUrl(localizedPath(href, locale)),
    lastModified,
    changeFrequency: opts?.changeFrequency,
    priority: opts?.priority,
    alternates: { languages },
  }));
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
      routing.locales.filter((locale) => locales.has(locale)),
    ])
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [fixtures, groups, articles, teamSlugs] = await Promise.all([
    getStaticFixturesForBuild(),
    getGroupNames().catch(() => []),
    getArticleSitemapEntries().catch(() => []),
    getAllTeamSlugs().catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  const generatedAt = new Date();
  const articleLocales = articleLocalesBySlug(articles);

  // Static hubs
  entries.push(...withAlternates("/", generatedAt, { changeFrequency: "daily", priority: 1 }));
  entries.push(
    ...withAlternates("/piala-dunia-2026", generatedAt, {
      changeFrequency: "daily",
      priority: 0.9,
    })
  );
  entries.push(
    ...withAlternates("/berita", generatedAt, { changeFrequency: "daily", priority: 0.8 })
  );
  entries.push(
    ...withAlternates("/arsip", generatedAt, { changeFrequency: "daily", priority: 0.7 })
  );
  entries.push(
    ...withAlternates("/skor", generatedAt, { changeFrequency: "hourly", priority: 0.9 })
  );
  entries.push(
    ...withAlternates("/jadwal", generatedAt, { changeFrequency: "daily", priority: 0.8 })
  );
  entries.push(
    ...withAlternates("/tim", generatedAt, { changeFrequency: "weekly", priority: 0.7 })
  );
  entries.push(
    ...withAlternates("/peringkat", generatedAt, { changeFrequency: "daily", priority: 0.6 })
  );
  entries.push(
    ...withAlternates("/prediksi", generatedAt, { changeFrequency: "weekly", priority: 0.6 })
  );
  entries.push(
    ...withAlternates("/cerita", generatedAt, { changeFrequency: "daily", priority: 0.6 })
  );
  entries.push(
    ...withAlternates("/nonton", generatedAt, { changeFrequency: "weekly", priority: 0.6 })
  );

  // AMP Web Stories per fixture (Discover surface)
  for (const f of fixtures) {
    entries.push(
      ...withAlternates(
        { pathname: "/cerita/[slug]", params: { slug: f.slug } },
        generatedAt,
        { changeFrequency: "daily", priority: 0.5 }
      )
    );
  }

  // Teams (squad + schedule programmatic pages)
  for (const slug of teamSlugs) {
    entries.push(
      ...withAlternates(
        { pathname: "/tim/[slug]", params: { slug } },
        generatedAt,
        { changeFrequency: "weekly", priority: 0.6 }
      )
    );
  }

  // Groups
  for (const g of groups) {
    const group = g.replace("Group ", "").toLowerCase();
    entries.push(
      ...withAlternates(
        { pathname: "/piala-dunia-2026/grup/[group]", params: { group } },
        generatedAt,
        { changeFrequency: "daily", priority: 0.7 }
      )
    );
  }

  // Matches
  for (const f of fixtures) {
    entries.push(
      ...withAlternates(
        { pathname: "/pertandingan/[slug]", params: { slug: f.slug } },
        generatedAt,
        { changeFrequency: "daily", priority: 0.6 }
      )
    );
  }

  // Articles (one entry per locale that actually has the article)
  for (const a of articles) {
    const href = { pathname: "/artikel/[slug]", params: { slug: a.slug } } as const;
    const locales = articleLocales.get(a.slug) ?? [a.locale];
    entries.push({
      url: absoluteUrl(localizedPath(href, a.locale)),
      lastModified: a.updatedAt ?? a.publishedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: buildLanguageAlternates(href, locales) },
    });
  }

  return entries;
}
