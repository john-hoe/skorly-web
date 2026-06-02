import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGroupedTeams, getBracket } from "@skorly/db";
import { getSessionUser } from "@/lib/supabase/server";
import { BracketBuilder } from "@/components/bracket-builder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bracket" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function BracketPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("bracket");
  const user = await getSessionUser();
  const [groups, bracket] = await Promise.all([
    getGroupedTeams().catch(() => []),
    user ? getBracket(user.id).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("subtitle")}</p>
      </header>

      <BracketBuilder groups={groups} initial={bracket} authed={!!user} />
    </div>
  );
}
