import type { ArticleView } from "@skorly/db";
import { Link } from "@/i18n/navigation";

const TYPE_LABEL: Record<string, string> = {
  preview: "Pratinjau",
  watchpoints: "Sorotan",
  prediction: "Prediksi",
  recap: "Ulasan",
  tactical: "Taktik",
  group_analysis: "Analisis Grup",
};

export function ArticleCard({ article }: { article: ArticleView }) {
  return (
    <Link
      href={{ pathname: "/artikel/[slug]", params: { slug: article.slug } }}
      className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"
    >
      <span className="inline-block rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-xs font-medium text-[var(--brand)]">
        {TYPE_LABEL[article.type] ?? article.type}
      </span>
      <h3 className="mt-2 font-semibold leading-snug line-clamp-2">{article.title}</h3>
      {article.summary && (
        <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">{article.summary}</p>
      )}
    </Link>
  );
}
