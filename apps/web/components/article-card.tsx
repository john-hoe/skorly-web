import type { ArticleView } from "@skorly/db";
import { Link } from "@/i18n/navigation";

const TYPE_LABEL: Record<string, string> = {
  preview: "Pratinjau",
  watchpoints: "Sorotan",
  prediction: "Prediksi",
  recap: "Ulasan",
  tactical: "Taktik",
  group_analysis: "Analisis Grup",
  news: "Berita",
};

export function ArticleCard({ article }: { article: ArticleView }) {
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
          {TYPE_LABEL[article.type] ?? article.type}
        </span>
        <h3 className="mt-2 font-semibold leading-snug line-clamp-2">{article.title}</h3>
        {article.summary && (
          <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">{article.summary}</p>
        )}
      </div>
    </Link>
  );
}
