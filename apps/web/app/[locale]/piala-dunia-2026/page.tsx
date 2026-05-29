import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function WorldCupHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WorldCupHub />;
}

function WorldCupHub() {
  const t = useTranslations("nav");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("worldCup")}</h1>
      {/* TODO Day 9: 12 group cards + full 104-match schedule + standings */}
      <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
        {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map(
          (g) => (
            <div
              key={g}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center"
            >
              <span className="text-sm text-[var(--muted)]">{t("groups")}</span>
              <p className="text-2xl font-bold">{g}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
