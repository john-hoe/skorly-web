"use client";

import { useState } from "react";
import type { ArticleCardData } from "@skorly/db";
import { ArticleCard } from "./article-card";

/**
 * Grid of article cards with a client-side "load more" button. The full list is
 * passed in (card fields only, no body) and revealed in pages of `pageSize`.
 * Article URLs are also in sitemap.xml, so SEO discovery doesn't depend on this.
 */
export function ArticleGrid({
  articles,
  pageSize = 24,
  loadMoreLabel,
}: {
  articles: ArticleCardData[];
  pageSize?: number;
  loadMoreLabel: string;
}) {
  const [visible, setVisible] = useState(pageSize);
  const remaining = articles.length - visible;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {articles.slice(0, visible).map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      {remaining > 0 && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            className="rounded-full border border-[var(--border)] px-6 py-2.5 text-sm font-medium transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            {loadMoreLabel} ({remaining})
          </button>
        </div>
      )}
    </>
  );
}
