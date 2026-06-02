import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMiniLeagueBySlug, getMiniLeagueStandings } from "@skorly/db";
import { getSessionUser } from "@/lib/supabase/server";
import { LeagueInvite } from "@/components/league-invite";
import { LeagueJoin } from "@/components/league-join";
import { absoluteUrl, localizedPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const league = await getMiniLeagueBySlug(slug).catch(() => null);
  const t = await getTranslations({ locale, namespace: "league" });
  return {
    title: league ? league.name : t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("league");

  const league = await getMiniLeagueBySlug(slug).catch(() => null);
  const user = await getSessionUser().catch(() => null);

  if (!league) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg text-[var(--muted)]">{t("notFound")}</p>
      </div>
    );
  }

  const standings = await getMiniLeagueStandings(league.id).catch(() => []);
  const isMember = !!user && standings.some((s) => s.userId === user.id);
  const inviteUrl = absoluteUrl(
    localizedPath({ pathname: "/liga/[slug]", params: { slug } }, locale),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="text-sm text-[var(--muted)]">{t("members", { count: league.memberCount })}</p>
      </header>

      {!isMember && <LeagueJoin slug={slug} authed={!!user} />}

      <LeagueInvite url={inviteUrl} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("standings")}</h2>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t("rank")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("player")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("played")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("points")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {standings.map((s, i) => {
                const me = !!user && s.userId === user.id;
                const name = s.displayName?.trim() || "Skorly";
                return (
                  <tr key={s.userId} className={me ? "bg-[var(--brand)]/5" : ""}>
                    <td className="px-3 py-2 tabular-nums text-[var(--muted)]">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">
                      {name}
                      {me && (
                        <span className="ml-2 rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                          {t("you")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--muted)]">{s.played}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-[var(--brand)]">
                      {s.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
