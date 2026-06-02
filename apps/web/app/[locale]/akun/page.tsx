import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getProfile,
  getTeamOptions,
  getUserPredictionStats,
  getUserPredictions,
} from "@skorly/db";
import { Link, redirect } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { AccountForm } from "@/components/auth/account-form";
import { SignOutButton } from "@/components/auth/sign-out-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (!user) redirect({ href: "/masuk", locale });

  const t = await getTranslations("account");
  const [profile, teams, stats, myPredictions] = await Promise.all([
    getProfile(user!.id).catch(() => null),
    getTeamOptions().catch(() => []),
    getUserPredictionStats(user!.id).catch(() => null),
    getUserPredictions(user!.id, 20).catch(() => []),
  ]);

  const meta = (user!.user_metadata ?? {}) as Record<string, string>;
  const displayName = profile?.displayName ?? meta.display_name ?? "";
  const role = profile?.role ?? "member";
  const roleKey = ["member", "premium", "admin"].includes(role) ? role : "member";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-[var(--muted)]">
            {t("role")}:{" "}
            <span className="font-medium text-[var(--brand)]">
              {t(`roles.${roleKey}`)}
            </span>
          </p>
        </div>
        <SignOutButton />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("stats.points")} value={stats?.points ?? 0} />
        <StatCard
          label={t("stats.rank")}
          value={stats?.rank != null ? `#${stats.rank}` : t("stats.unranked")}
        />
        <StatCard label={t("stats.played")} value={stats?.scored ?? 0} />
        <StatCard label={t("stats.exact")} value={stats?.exact ?? 0} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("myPredictions")}</h2>
        {myPredictions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("noPredictions")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            {myPredictions.map((p) => (
              <li key={p.fixtureId}>
                <Link
                  href={{ pathname: "/pertandingan/[slug]", params: { slug: p.slug } }}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--background)]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {p.homeName} <span className="text-[var(--muted)]">vs</span> {p.awayName}
                  </span>
                  <span className="text-sm tabular-nums">
                    <span className="font-bold">
                      {p.homeGoalsPred}-{p.awayGoalsPred}
                    </span>
                    {p.homeGoals != null && p.awayGoals != null && (
                      <span className="ml-2 text-[var(--muted)]">
                        ({p.homeGoals}-{p.awayGoals})
                      </span>
                    )}
                  </span>
                  {p.pointsAwarded != null && (
                    <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--brand)]">
                      +{p.pointsAwarded}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AccountForm
        email={user!.email ?? profile?.email ?? ""}
        displayName={displayName}
        whatsappNumber={profile?.whatsappNumber ?? ""}
        favoriteTeamId={profile?.favoriteTeamId ?? null}
        consentMarketing={profile?.consentMarketing ?? false}
        teams={teams}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
      <div className="text-xl font-bold tabular-nums text-[var(--brand)]">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}
