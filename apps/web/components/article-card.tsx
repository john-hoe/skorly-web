"use client";

import { useTranslations } from "next-intl";
import type { ArticleCardData } from "@skorly/db";
import { Link } from "@/i18n/navigation";
import { ARTICLE_TYPE_KEY } from "@/lib/article-types";

export function ArticleCard({ article }: { article: ArticleCardData }) {
  const t = useTranslations();
  const labelKey = ARTICLE_TYPE_KEY[article.type];
  const label = labelKey ? t(labelKey) : article.type;
  return (
    <Link
      href={{ pathname: "/artikel/[slug]", params: { slug: article.slug } }}
      className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition hover:border-[var(--brand)]"
    >
      {article.imageUrl && (
        <div className="aspect-[16/9] overflow-hidden bg-[var(--brand)]/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="p-4">
        <span className="inline-block rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-xs font-medium text-[var(--brand)]">
          {label}
        </span>
        <h3 className="mt-2 font-semibold leading-snug line-clamp-2">{article.title}</h3>
        {article.summary && (
          <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">{article.summary}</p>
        )}
      </div>
    </Link>
  );
}
