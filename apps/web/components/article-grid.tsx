"use client";

import { useMemo, useState } from "react";
import type { ArticleCardData } from "@skorly/db";
import { ArticleCard } from "./article-card";

export type ArticleFilter = { value: string; label: string };

/**
 * Grid of article cards with optional type-filter tabs and a client-side
 * "load more" button. The full list is passed in (card fields only, no body)
 * and revealed in pages of `pageSize`. Article URLs are also in sitemap.xml,
 * so SEO discovery doesn't depend on this.
 */
export function ArticleGrid({
  articles,
  pageSize = 24,
  loadMoreLabel,
  filters,
  allLabel,
}: {
  articles: ArticleCardData[];
  pageSize?: number;
  loadMoreLabel: string;
  filters?: ArticleFilter[];
  allLabel?: string;
}) {
  const [active, setActive] = useState("all");
  const [visible, setVisible] = useState(pageSize);

  const filtered = useMemo(
    () => (active === "all" ? articles : articles.filter((a) => a.type === active)),
    [articles, active],
  );
  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  function selectFilter(value: string) {
    setActive(value);
    setVisible(pageSize);
  }

  const showTabs = filters && filters.length > 1;

  return (
    <>
      {showTabs && (
        <div className="flex flex-wrap gap-2">
          <FilterTab active={active === "all"} onClick={() => selectFilter("all")}>
            {allLabel}
          </FilterTab>
          {filters.map((f) => (
            <FilterTab
              key={f.value}
              active={active === f.value}
              onClick={() => selectFilter(f.value)}
            >
              {f.label}
            </FilterTab>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a) => (
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

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--brand)] text-white"
          : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
      }`}
    >
      {children}
    </button>
  );
}
