import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShareButtons } from "@/components/share-buttons";
import { absoluteUrl, buildCanonicalMetadata, localizedPath, pageSeoDescription } from "@/lib/seo";
import { getRuntimeLeaderboard } from "@/lib/runtime-data";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "leaderboard" });
  const tg = await getTranslations({ locale });
  const title = `${t("title")} — ${tg("nav.worldCup")}`;
  const description = pageSeoDescription(locale, "leaderboard");
  const ogImage = absoluteUrl(
    `/og?kind=leaderboard&t=${encodeURIComponent(title)}&s=${encodeURIComponent(description)}`
  );
  const canonicalMetadata = buildCanonicalMetadata("/peringkat", locale);
  return {
    title,
    description,
    ...canonicalMetadata,
    openGraph: { ...canonicalMetadata.openGraph, title, description, images: [ogImage] },
    twitter: { card: "summary_large_image", images: [ogImage] },
  };
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("leaderboard");
  const tb = await getTranslations("bracket");
  const rows = await getRuntimeLeaderboard(100).catch(() => []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-[var(--muted)]">{t("subtitle")}</p>
        </div>
        <Link
          href="/prediksi"
          className="shrink-0 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          {tb("title")}
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3 w-12">{t("rank")}</th>
                <th className="px-4 py-3">{t("player")}</th>
                <th className="px-4 py-3 text-right">{t("points")}</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">{t("played")}</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">{t("exact")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.userId}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-bold tabular-nums text-[var(--muted)]">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {r.displayName?.trim() || t("anonymous")}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--brand)]">
                    {r.points}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                    {r.played}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                    {r.exact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--muted)]">{t("scoring")}</p>
        <ShareButtons
          url={localizedPath("/peringkat", locale)}
          text={t("shareText")}
          compact
          contentType="leaderboard"
          contentId="world-cup-2026"
        />
      </div>
    </div>
  );
}
