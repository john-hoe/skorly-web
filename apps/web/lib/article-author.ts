import { absoluteUrl, localizedPath } from "@/lib/seo";

export const ARTICLE_AUTHOR_SLUG = "john-vega";
export const ARTICLE_AUTHOR_NAME =
  process.env.NEWS_ARTICLE_AUTHOR_NAME?.trim() || "John Vega";

const configuredAuthorUrl = process.env.NEWS_ARTICLE_AUTHOR_URL?.trim();

const ARTICLE_AUTHOR_HREF = {
  pathname: "/author/[slug]",
  params: { slug: ARTICLE_AUTHOR_SLUG },
} as const;

export function articleAuthorPath(locale: string): string {
  return localizedPath(ARTICLE_AUTHOR_HREF, locale);
}

export function articleAuthorUrl(locale: string): string {
  return configuredAuthorUrl
    ? absoluteUrl(configuredAuthorUrl)
    : absoluteUrl(articleAuthorPath(locale));
}
