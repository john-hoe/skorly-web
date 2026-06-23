import { localizedSitePath } from "@skorly/types";
import type { ArticleSitemapEntry } from "@skorly/db";

export const DEFAULT_INDEXNOW_KEY = "e3cb02d1aa682eff2ac76b05153b4b9b";
export const DEFAULT_INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const DEFAULT_SITE_URL = "https://skorly.cc";

type FetchLike = typeof fetch;

export interface IndexNowSubmitOptions {
  endpoint?: string;
  fetchImpl?: FetchLike;
  key?: string;
  siteUrl?: string;
}

export interface IndexNowSubmitResult {
  submitted: number;
  status: number;
  endpoint: string;
}

export function normalizeSiteUrl(siteUrl: string | undefined): string {
  return (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export function indexNowKeyLocation(siteUrl: string, key: string): string {
  return `${normalizeSiteUrl(siteUrl)}/${key}.txt`;
}

export function articleUrlForIndexNow(
  entry: Pick<ArticleSitemapEntry, "locale" | "slug">,
  siteUrl = DEFAULT_SITE_URL,
): string {
  const path = localizedSitePath(entry.locale, "article", { slug: entry.slug });
  return new URL(path, normalizeSiteUrl(siteUrl)).toString();
}

export function latestArticleTimestamp(entry: Pick<ArticleSitemapEntry, "publishedAt" | "updatedAt">): number {
  return Math.max(entry.updatedAt?.getTime() ?? 0, entry.publishedAt?.getTime() ?? 0);
}

export function recentArticleEntries(
  entries: ArticleSitemapEntry[],
  options: { since: Date; limit: number },
): ArticleSitemapEntry[] {
  return entries
    .filter((entry) => latestArticleTimestamp(entry) >= options.since.getTime())
    .sort((a, b) => latestArticleTimestamp(b) - latestArticleTimestamp(a))
    .slice(0, options.limit);
}

export function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
}

export function buildIndexNowPayload(urls: string[], options: Required<Pick<IndexNowSubmitOptions, "key" | "siteUrl">>) {
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  return {
    host: new URL(siteUrl).host,
    key: options.key,
    keyLocation: indexNowKeyLocation(siteUrl, options.key),
    urlList: uniqueUrls(urls),
  };
}

export async function submitIndexNowUrls(
  urls: string[],
  options: IndexNowSubmitOptions = {},
): Promise<IndexNowSubmitResult> {
  const key = options.key ?? process.env.INDEXNOW_KEY ?? DEFAULT_INDEXNOW_KEY;
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL);
  const endpoint = options.endpoint ?? process.env.INDEXNOW_ENDPOINT ?? DEFAULT_INDEXNOW_ENDPOINT;
  const payload = buildIndexNowPayload(urls, { key, siteUrl });

  if (!payload.urlList.length) {
    return { submitted: 0, status: 204, endpoint };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `IndexNow submit failed: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}`,
    );
  }

  return { submitted: payload.urlList.length, status: response.status, endpoint };
}
