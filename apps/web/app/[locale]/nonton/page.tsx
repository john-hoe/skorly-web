import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildAlternates, pageSeoDescription } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t("watch.title"),
    description: pageSeoDescription(locale, "watch"),
    alternates: buildAlternates("/nonton", locale),
  };
}

/**
 * Curated, official-only broadcaster pointers. We deliberately link to the
 * rights holder's own domain (or FIFA's official listing) rather than asserting
 * exact channel line-ups, since broadcast rights shift. No piracy links.
 */
const GLOBAL = {
  name: "FIFA / FIFA+",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
};

interface Region {
  /** ISO-ish label; rendered as-is. */
  label: string;
  /** Known official rights holder, if confidently established; else null. */
  broadcaster: { name: string; url: string } | null;
}

const REGIONS: Region[] = [
  { label: "Indonesia", broadcaster: null },
  { label: "Việt Nam", broadcaster: null },
  { label: "Philippines", broadcaster: null },
  {
    label: "United States",
    broadcaster: { name: "FOX Sports / Telemundo", url: "https://www.foxsports.com" },
  },
  {
    label: "Canada",
    broadcaster: { name: "CTV / TSN (Bell Media)", url: "https://www.tsn.ca" },
  },
  {
    label: "United Kingdom",
    broadcaster: { name: "BBC Sport / ITV", url: "https://www.bbc.co.uk/sport/football" },
  },
  {
    label: "中国大陆 / China",
    broadcaster: { name: "CCTV (央视)", url: "https://tv.cctv.com" },
  },
];

export default async function WhereToWatchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("watch.title")}</h1>
        <p className="mt-1 text-[var(--muted)]">{t("watch.subtitle")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("watch.globalHeading")}</h2>
        <a
          href={GLOBAL.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition hover:border-[var(--brand)]"
        >
          <span className="font-medium">{GLOBAL.name}</span>
          <span className="text-sm text-[var(--brand)]">{t("watch.officialSite")} →</span>
        </a>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("watch.regionHeading")}</h2>
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          {REGIONS.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium">{r.label}</span>
              {r.broadcaster ? (
                <a
                  href={r.broadcaster.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm text-[var(--brand)] hover:underline"
                >
                  {r.broadcaster.name} →
                </a>
              ) : (
                <span className="shrink-0 text-right text-xs text-[var(--muted)]">
                  {t("watch.tbd")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
        {t("watch.disclaimer")}
      </p>
    </div>
  );
}
