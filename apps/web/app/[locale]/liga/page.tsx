import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMyMiniLeagues } from "@skorly/db";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { LeagueCreate } from "@/components/league-create";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "league" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function LeaguesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("league");

  const user = await getSessionUser().catch(() => null);
  const leagues = user ? await getMyMiniLeagues(user.id).catch(() => []) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-[var(--muted)]">{t("subtitle")}</p>
      </header>

      {user ? (
        <section className="space-y-4">
          <LeagueCreate />
        </section>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm">
          <span className="text-[var(--muted)]">{t("loginCta")} </span>
          <Link href="/masuk" className="font-semibold text-[var(--brand)]">
            {t("login")}
          </Link>
        </div>
      )}

      {user && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("myLeagues")}</h2>
          {leagues.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              {leagues.map((l) => (
                <li key={l.id}>
                  <Link
                    href={{ pathname: "/liga/[slug]", params: { slug: l.slug } }}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--background)]"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.name}</span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {t("members", { count: l.memberCount })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
