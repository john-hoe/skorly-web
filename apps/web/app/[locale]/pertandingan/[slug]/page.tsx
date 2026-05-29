import { setRequestLocale } from "next-intl/server";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // TODO Day 8: fetch fixture + articles (preview/watchpoints/prediction/recap/tactical) by slug
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Pertandingan: {slug}</h1>
      <p className="text-sm text-[var(--muted)]">
        Pratinjau, prediksi, dan analisis akan ditampilkan di sini.
      </p>
    </div>
  );
}
