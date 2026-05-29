import { setRequestLocale } from "next-intl/server";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // TODO Day 9: fetch article by slug, render body + Schema.org NewsArticle
  return (
    <article className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Artikel: {slug}</h1>
      <p className="text-sm text-[var(--muted)]">Isi artikel akan dimuat di sini.</p>
    </article>
  );
}
