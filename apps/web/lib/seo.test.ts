import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  getPathname: ({ href, locale }: { href: string | { pathname: string }; locale: string }) => {
    const pathname = typeof href === "string" ? href : href.pathname;
    return `/${locale}${pathname === "/" ? "" : pathname}`;
  },
}));

vi.mock("@/i18n/routing", () => ({
  routing: { defaultLocale: "id" },
}));

vi.mock("@/i18n/locales", () => ({
  INDEXABLE_LOCALES: ["id", "vi", "en", "zh", "th"],
  LOCALE_HREFLANG: {
    id: "id",
    vi: "vi",
    en: "en",
    zh: "zh-Hans",
    th: "th-TH",
  },
  LOCALE_OG: {
    id: "id_ID",
    vi: "vi_VN",
    en: "en_US",
    zh: "zh_CN",
    th: "th_TH",
  },
}));

const { fitMetaDescription, matchSeoDescription, pageSeoDescription } = await import("./seo");

function lengthOf(text: string): number {
  return Array.from(text).length;
}

describe("SEO descriptions", () => {
  it("keeps localized page descriptions long enough for search snippets", () => {
    const locales = ["id", "vi", "en", "zh", "th"];
    const kinds = [
      "home",
      "worldCup",
      "teams",
      "team",
      "schedule",
      "scores",
      "news",
      "articles",
      "leaderboard",
      "bracket",
      "stories",
      "watch",
      "group",
    ] as const;

    for (const locale of locales) {
      for (const kind of kinds) {
        const subject = kind === "team" ? "USA" : kind === "group" ? "A" : undefined;
        const description = pageSeoDescription(locale, kind, subject);

        expect(lengthOf(description), `${locale}:${kind}`).toBeGreaterThanOrEqual(90);
        expect(lengthOf(description), `${locale}:${kind}`).toBeLessThanOrEqual(155);
      }
    }
  });

  it("expands short match descriptions while preserving the fixture title", () => {
    const description = matchSeoDescription("zh", "USA vs Paraguay");

    expect(description).toContain("USA vs Paraguay");
    expect(lengthOf(description)).toBeGreaterThanOrEqual(90);
    expect(lengthOf(description)).toBeLessThanOrEqual(155);
  });

  it("uses the localized fallback for short article summaries", () => {
    const fallback = pageSeoDescription("zh", "articles");
    const description = fitMetaDescription("短讯。", fallback, 140, undefined, "zh");

    expect(description).toContain("短讯");
    expect(lengthOf(description)).toBeGreaterThanOrEqual(90);
    expect(lengthOf(description)).toBeLessThanOrEqual(140);
  });
});
