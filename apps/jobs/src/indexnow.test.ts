import { describe, expect, it, vi } from "vitest";
import type { ArticleSitemapEntry } from "@skorly/db";
import {
  articleUrlForIndexNow,
  buildIndexNowPayload,
  recentArticleEntries,
  submitIndexNowUrls,
} from "./indexnow";

function article(input: Partial<ArticleSitemapEntry> & { slug: string; locale: string }): ArticleSitemapEntry {
  return {
    title: input.title ?? input.slug,
    publishedAt: input.publishedAt ?? null,
    updatedAt: input.updatedAt ?? null,
    ...input,
  };
}

describe("IndexNow helpers", () => {
  it("builds localized article URLs", () => {
    expect(articleUrlForIndexNow(article({ locale: "vi", slug: "argentina-vs-algeria-20260617-prediction" })))
      .toBe("https://skorly.cc/vi/bai-viet/argentina-vs-algeria-20260617-prediction");

    expect(articleUrlForIndexNow(article({ locale: "zh", slug: "argentina-vs-algeria-20260617-prediction" })))
      .toBe("https://skorly.cc/zh/wenzhang/argentina-vs-algeria-20260617-prediction");
  });

  it("filters and sorts recent article entries", () => {
    const entries = [
      article({ locale: "en", slug: "old", publishedAt: new Date("2026-06-01T00:00:00Z") }),
      article({ locale: "en", slug: "fresh", publishedAt: new Date("2026-06-22T00:00:00Z") }),
      article({
        locale: "en",
        slug: "updated",
        publishedAt: new Date("2026-06-01T00:00:00Z"),
        updatedAt: new Date("2026-06-23T00:00:00Z"),
      }),
    ];

    expect(recentArticleEntries(entries, { since: new Date("2026-06-20T00:00:00Z"), limit: 10 }).map((e) => e.slug))
      .toEqual(["updated", "fresh"]);
  });

  it("posts the IndexNow payload with unique URLs", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 200 }));

    await submitIndexNowUrls(["https://skorly.cc/en/article/a", "https://skorly.cc/en/article/a"], {
      fetchImpl,
      key: "test-key",
      siteUrl: "https://skorly.cc/",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.indexnow.org/indexnow",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(
          buildIndexNowPayload(["https://skorly.cc/en/article/a"], {
            key: "test-key",
            siteUrl: "https://skorly.cc",
          }),
        ),
      }),
    );
  });
});
