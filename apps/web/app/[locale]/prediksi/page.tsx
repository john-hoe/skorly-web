import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BracketBuilder } from "@/components/bracket-builder";
import { buildCanonicalMetadata, pageSeoDescription } from "@/lib/seo";

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bracket" });
  const tg = await getTranslations({ locale });
  return {
    title: `${t("title")} — ${tg("nav.worldCup")}`,
    description: pageSeoDescription(locale, "bracket"),
    ...buildCanonicalMetadata("/prediksi", locale),
  };
}

export default async function BracketPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("bracket");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("subtitle")}</p>
      </header>

      <BracketBuilder groups={[]} initial={null} />
    </div>
  );
}
