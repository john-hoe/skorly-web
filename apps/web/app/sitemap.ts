import type { MetadataRoute } from "next";
import {
  getAllFixtures,
  getGroupNames,
  getArticleSitemapEntries,
} from "@skorly/db";
import { routing } from "@/i18n/routing";
import { absoluteUrl, localizedPath } from "@/lib/seo";

export const dynamic = "force-static";

type Href = Parameters<typeof localizedPath>[0];

/** One sitemap entry per locale URL, each carrying hreflang alternates. */
function withAlternates(
  href: Href,
  lastModified?: Date,
  opts?: { changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]; priority?: number }
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l === "zh" ? "zh-Hans" : l] = absoluteUrl(localizedPath(href, l));
  }
  languages["x-default"] = absoluteUrl(localizedPath(href, routing.defaultLocale));

  return routing.locales.map((locale) => ({
    url: absoluteUrl(localizedPath(href, locale)),
    lastModified,
    changeFrequency: opts?.changeFrequency,
    priority: opts?.priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [fixtures, groups, articles] = await Promise.all([
    getAllFixtures().catch(() => []),
    getGroupNames().catch(() => []),
    getArticleSitemapEntries().catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  // Static hubs
  entries.push(...withAlternates("/", new Date(), { changeFrequency: "daily", priority: 1 }));
  entries.push(
    ...withAlternates("/piala-dunia-2026", new Date(), {
      changeFrequency: "daily",
      priority: 0.9,
    })
  );

  // Groups
  for (const g of groups) {
    const group = g.replace("Group ", "").toLowerCase();
    entries.push(
      ...withAlternates(
        { pathname: "/piala-dunia-2026/grup/[group]", params: { group } },
        new Date(),
        { changeFrequency: "daily", priority: 0.7 }
      )
    );
  }

  // Matches
  for (const f of fixtures) {
    entries.push(
      ...withAlternates(
        { pathname: "/pertandingan/[slug]", params: { slug: f.slug } },
        f.kickoffAt ?? undefined,
        { changeFrequency: "daily", priority: 0.6 }
      )
    );
  }

  // Articles (one entry per locale that actually has the article)
  for (const a of articles) {
    entries.push({
      url: absoluteUrl(
        localizedPath({ pathname: "/artikel/[slug]", params: { slug: a.slug } }, a.locale)
      ),
      lastModified: a.updatedAt ?? a.publishedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
