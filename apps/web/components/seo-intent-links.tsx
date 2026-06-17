import type { ComponentProps } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type LinkHref = ComponentProps<typeof Link>["href"];

type BaseLinkKey =
  | "scores"
  | "schedule"
  | "predictions"
  | "groups"
  | "teams"
  | "watch"
  | "news"
  | "archive";

type IntentLink = {
  key: BaseLinkKey | `team-${string}`;
  href: LinkHref;
  title: string;
  description: string;
};

const BASE_LINKS: Array<{ key: BaseLinkKey; href: LinkHref }> = [
  { key: "scores", href: "/skor" },
  { key: "schedule", href: "/jadwal" },
  { key: "predictions", href: "/prediksi" },
  { key: "groups", href: "/piala-dunia-2026" },
  { key: "teams", href: "/tim" },
  { key: "watch", href: "/nonton" },
  { key: "news", href: "/berita" },
  { key: "archive", href: "/arsip" },
];

export async function SeoIntentLinks({
  variant = "default",
  teams = [],
}: {
  variant?: "default" | "home" | "scores" | "schedule" | "match";
  teams?: Array<{ name: string; slug: string | null | undefined }>;
}) {
  const t = await getTranslations("seoLinks");
  const baseLinks = BASE_LINKS.map((item) => ({
    key: item.key,
    href: item.href,
    title: t(`items.${item.key}.title`),
    description: t(`items.${item.key}.description`),
  })) satisfies IntentLink[];
  const teamLinks = teams
    .filter((team) => team.slug)
    .slice(0, 2)
    .map((team) => ({
      key: `team-${team.slug}`,
      href: { pathname: "/tim/[slug]", params: { slug: team.slug! } },
      title: t("teamTitle", { team: team.name }),
      description: t("teamDescription", { team: team.name }),
    })) satisfies IntentLink[];
  const links = variant === "match" ? [...teamLinks, ...baseLinks] : baseLinks;

  return (
    <section
      aria-labelledby={`seo-intent-${variant}`}
      className="space-y-3"
    >
      <div className="space-y-1">
        <h2 id={`seo-intent-${variant}`} className="text-lg font-bold">
          {t("title")}
        </h2>
        <p className="text-sm leading-6 text-[var(--muted)]">{t("description")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition hover:border-[var(--brand)]"
          >
            <span className="block text-sm font-semibold leading-snug [overflow-wrap:anywhere] group-hover:text-[var(--brand)]">
              {item.title}
            </span>
            <span className="mt-1 block text-xs leading-5 text-[var(--muted)] [overflow-wrap:anywhere]">
              {item.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
