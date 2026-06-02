import { defineRouting } from "next-intl/routing";

/**
 * Locale + pathname routing config.
 * Markets: Indonesia (id), Vietnam (vi), Philippines/global English (en), Chinese (zh).
 * Localized pathnames keep SEO-friendly slugs per market (e.g. /id/pertandingan vs /vi/tran-dau).
 */
export const routing = defineRouting({
  locales: ["id", "vi", "en", "zh"],
  defaultLocale: "id",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/piala-dunia-2026": {
      id: "/piala-dunia-2026",
      vi: "/world-cup-2026",
      en: "/world-cup-2026",
      zh: "/shijiebei-2026",
    },
    "/piala-dunia-2026/grup/[group]": {
      id: "/piala-dunia-2026/grup/[group]",
      vi: "/world-cup-2026/bang/[group]",
      en: "/world-cup-2026/group/[group]",
      zh: "/shijiebei-2026/xiaozu/[group]",
    },
    "/pertandingan/[slug]": {
      id: "/pertandingan/[slug]",
      vi: "/tran-dau/[slug]",
      en: "/match/[slug]",
      zh: "/bisai/[slug]",
    },
    "/tim/[slug]": {
      id: "/tim/[slug]",
      vi: "/doi-tuyen/[slug]",
      en: "/team/[slug]",
      zh: "/qiudui/[slug]",
    },
    "/artikel/[slug]": {
      id: "/artikel/[slug]",
      vi: "/bai-viet/[slug]",
      en: "/article/[slug]",
      zh: "/wenzhang/[slug]",
    },
    "/berita": {
      id: "/berita",
      vi: "/tin-tuc",
      en: "/news",
      zh: "/xinwen",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
