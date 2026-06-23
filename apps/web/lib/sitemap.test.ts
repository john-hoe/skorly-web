import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  getPathname: ({
    href,
    locale,
  }: {
    href: string | { pathname: string; params?: Record<string, string> };
    locale: string;
  }) => {
    if (typeof href === "string") return `/${locale}${href === "/" ? "" : href}`;
    if (href.pathname === "/artikel/[slug]") {
      const articleSegment: Record<string, string> = {
        id: "artikel",
        vi: "bai-viet",
        en: "article",
        zh: "wenzhang",
        th: "บทความ",
      };
      return `/${locale}/${articleSegment[locale] ?? "article"}/${href.params?.slug}`;
    }
    return `/${locale}${href.pathname}`;
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
import {
  articleSitemapEntries,
  buildSitemapIndexXml,
  buildSitemapXml,
  sitemapIndexEntries,
} from "./sitemap";

describe("sitemap helpers", () => {
  it("builds a lightweight sitemap index for submitted GSC entrypoint", () => {
    const entries = sitemapIndexEntries(new Date("2026-06-23T00:00:00.000Z"));
    const xml = buildSitemapIndexXml(entries);

    expect(xml).toContain("<sitemapindex");
    expect(xml).not.toContain("<urlset");
    expect(xml).toContain("https://skorly.cc/sitemaps/static.xml");
    expect(xml).toContain("https://skorly.cc/sitemaps/articles.xml");
    expect(xml).toContain("https://skorly.cc/news-sitemap.xml");
    expect(xml.length).toBeLessThan(5_000);
  });

  it("percent-encodes localized URLs before XML escaping", () => {
    const xml = buildSitemapXml([
      {
        url: "https://skorly.cc/th/ฟุตบอลโลก-2026",
        alternates: {
          "th-TH": "https://skorly.cc/th/ฟุตบอลโลก-2026",
        },
      },
    ]);

    expect(xml).toContain("xmlns:xhtml");
    expect(xml).toContain("https://skorly.cc/th/%E0%B8%9F");
    expect(xml).not.toContain("ฟุตบอลโลก");
  });

  it("uses localized article route segments per locale", () => {
    const entries = articleSitemapEntries([
      {
        locale: "en",
        slug: "argentina-vs-algeria-20260617-prediction",
        title: "Argentina vs Algeria prediction",
        publishedAt: new Date("2026-06-17T00:00:00.000Z"),
        updatedAt: null,
      },
      {
        locale: "vi",
        slug: "argentina-vs-algeria-20260617-prediction",
        title: "Argentina vs Algeria prediction",
        publishedAt: new Date("2026-06-17T00:00:00.000Z"),
        updatedAt: null,
      },
    ]);

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://skorly.cc/en/article/argentina-vs-algeria-20260617-prediction",
      "https://skorly.cc/vi/bai-viet/argentina-vs-algeria-20260617-prediction",
    ]);
    expect(entries[0]?.alternates).toMatchObject({
      en: "https://skorly.cc/en/article/argentina-vs-algeria-20260617-prediction",
      vi: "https://skorly.cc/vi/bai-viet/argentina-vs-algeria-20260617-prediction",
    });
  });
});
