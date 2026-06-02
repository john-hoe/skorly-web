import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://skorly.cc"
).replace(/\/$/, "");

export const SITE_NAME = "Skorly";

type Href = Parameters<typeof getPathname>[0]["href"];

/** hreflang code per locale (Google-friendly). */
const HREFLANG: Record<string, string> = {
  id: "id",
  vi: "vi",
  en: "en",
  zh: "zh-Hans",
};

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

/** Localized path (with locale prefix) for a route in a given locale. */
export function localizedPath(href: Href, locale: string): string {
  return getPathname({ href, locale });
}

/**
 * Build Next metadata `alternates` (canonical for current locale + hreflang
 * languages for every locale + x-default).
 */
export function buildAlternates(href: Href, locale: string) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[HREFLANG[l] ?? l] = absoluteUrl(localizedPath(href, l));
  }
  languages["x-default"] = absoluteUrl(
    localizedPath(href, routing.defaultLocale)
  );
  return {
    canonical: absoluteUrl(localizedPath(href, locale)),
    languages,
  };
}

/** Open Graph locale tag per app locale. */
export const OG_LOCALE: Record<string, string> = {
  id: "id_ID",
  vi: "vi_VN",
  en: "en_PH",
  zh: "zh_CN",
};
