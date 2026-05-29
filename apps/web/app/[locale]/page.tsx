import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { SubscribeGiftCard } from "@/components/subscribe-gift-card";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      <section className="text-center py-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {t("heroTitle")}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{t("heroSubtitle")}</p>
      </section>

      <section className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">{t("latestArticles")}</h2>
          {/* TODO Day 7-10: render latest articles from DB */}
          <p className="text-sm text-[var(--muted)]">
            Konten akan tersedia setelah pipeline data & AI berjalan.
          </p>
        </div>
        <aside className="space-y-6">
          <SubscribeGiftCard source="homepage" />
        </aside>
      </section>
    </div>
  );
}
