import { defineRouting } from "next-intl/routing";

/**
 * Locale + pathname routing config.
 * Phase 0 ships `id` only; `vi` and `en` are wired now so Phase 1 just fills messages.
 * Localized pathnames keep SEO-friendly slugs per market (e.g. /id/pertandingan vs /vi/tran-dau).
 */
export const routing = defineRouting({
  locales: ["id", "vi", "en"],
  defaultLocale: "id",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/piala-dunia-2026": {
      id: "/piala-dunia-2026",
      vi: "/world-cup-2026",
      en: "/world-cup-2026",
    },
    "/pertandingan/[slug]": {
      id: "/pertandingan/[slug]",
      vi: "/tran-dau/[slug]",
      en: "/match/[slug]",
    },
    "/tim/[slug]": {
      id: "/tim/[slug]",
      vi: "/doi-tuyen/[slug]",
      en: "/team/[slug]",
    },
    "/artikel/[slug]": {
      id: "/artikel/[slug]",
      vi: "/bai-viet/[slug]",
      en: "/article/[slug]",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
