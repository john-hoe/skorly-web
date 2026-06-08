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
  // Page metadata and sitemap.xml emit explicit canonical/hreflang signals.
  // next-intl's automatic response Link header uses app locale ids (e.g. "zh")
  // and locale-less x-default URLs, which conflicts with those SEO signals.
  alternateLinks: false,
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
    "/tim": {
      id: "/tim",
      vi: "/doi-tuyen",
      en: "/teams",
      zh: "/qiudui",
    },
    "/tim/[slug]": {
      id: "/tim/[slug]",
      vi: "/doi-tuyen/[slug]",
      en: "/team/[slug]",
      zh: "/qiudui/[slug]",
    },
    "/jadwal": {
      id: "/jadwal",
      vi: "/lich-thi-dau",
      en: "/schedule",
      zh: "/saicheng",
    },
    // 二期 M2 — AMP Web Stories (Google Discover surface)
    "/cerita": {
      id: "/cerita",
      vi: "/cau-chuyen",
      en: "/web-stories",
      zh: "/gushi",
    },
    "/cerita/[slug]": {
      id: "/cerita/[slug]",
      vi: "/cau-chuyen/[slug]",
      en: "/web-stories/[slug]",
      zh: "/gushi/[slug]",
    },
    // 二期 M2 — legal "where to watch" (official broadcasters, no piracy)
    "/nonton": {
      id: "/nonton",
      vi: "/xem-o-dau",
      en: "/where-to-watch",
      zh: "/zhibo",
    },
    "/privacy": "/privacy",
    "/terms": "/terms",
    "/artikel/[slug]": {
      id: "/artikel/[slug]",
      vi: "/bai-viet/[slug]",
      en: "/article/[slug]",
      zh: "/wenzhang/[slug]",
    },
    "/author/[slug]": {
      id: "/penulis/[slug]",
      vi: "/tac-gia/[slug]",
      en: "/author/[slug]",
      zh: "/zuozhe/[slug]",
    },
    "/berita": {
      id: "/berita",
      vi: "/tin-tuc",
      en: "/news",
      zh: "/xinwen",
    },
    "/arsip": {
      id: "/arsip",
      vi: "/luu-tru",
      en: "/articles",
      zh: "/quanbu-wenzhang",
    },
    // 二期 — auth (single slug across locales so server-side redirects to
    // `/{locale}/akun` resolve without a per-locale path map).
    "/masuk": "/masuk",
    "/daftar": "/daftar",
    "/lupa-sandi": "/lupa-sandi",
    "/atur-ulang-sandi": "/atur-ulang-sandi",
    "/akun": "/akun",
    // 二期 — predictions & leaderboard
    "/prediksi": "/prediksi",
    "/peringkat": "/peringkat",
    // 二期 M5 — private prediction mini-leagues
    "/liga": "/liga",
    "/liga/[slug]": "/liga/[slug]",
    // 二期 — live scores & results (high-intent SEO term per market)
    "/skor": {
      id: "/skor-langsung",
      vi: "/ket-qua-truc-tiep",
      en: "/live-scores",
      zh: "/shishi-bifen",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
