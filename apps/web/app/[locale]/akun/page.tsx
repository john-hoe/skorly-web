import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AI_SLAYER_MIN_PLAYED } from "@skorly/types";
import { getSessionUser } from "@/lib/supabase/server";
import { AccountForm } from "@/components/auth/account-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ShareButtons } from "@/components/share-buttons";
import { localizedPath } from "@/lib/seo";
import {
  getRuntimeProfile,
  getRuntimeTeamOptions,
  getRuntimeUserPredictionStats,
  getRuntimeUserPredictions,
  getRuntimeUserVsAi,
  getRuntimeWeeklyVsAi,
  type RuntimeVsAiDuelRow,
  type RuntimeWeeklyVsAi,
} from "@/lib/runtime-data";

const ACCOUNT_DATA_TIMEOUT_MS = 8_000;

async function withAccountTimeout<T>(
  label: string,
  work: Promise<T>,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(
        `[account-page] ${label} exceeded ${ACCOUNT_DATA_TIMEOUT_MS}ms; rendering fallback data.`
      );
      resolve(fallback);
    }, ACCOUNT_DATA_TIMEOUT_MS);
    if (timer && typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }
  });

  try {
    return await Promise.race([
      work.catch((error) => {
        console.warn(`[account-page] ${label} failed; rendering fallback data.`, error);
        return fallback;
      }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

  const user = await withAccountTimeout("getSessionUser", getSessionUser(), null);
  if (!user) redirect({ href: "/masuk", locale });

  const t = await getTranslations("account");
  const [profile, teams, stats, myPredictions, vsAiRows, weeklyVsAi] = await Promise.all([
    withAccountTimeout("getProfile", getRuntimeProfile(user!.id), null),
    withAccountTimeout("getTeamOptions", getRuntimeTeamOptions(), []),
    withAccountTimeout("getUserPredictionStats", getRuntimeUserPredictionStats(user!.id), null),
    withAccountTimeout("getUserPredictions", getRuntimeUserPredictions(user!.id, 20), []),
    withAccountTimeout("getUserVsAi", getRuntimeUserVsAi(user!.id, 8), []),
    withAccountTimeout("getWeeklyVsAi", getRuntimeWeeklyVsAi(50, user!.id), null),
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

      <VsAiSection
        locale={locale}
        userId={user!.id}
        rows={vsAiRows}
        weekly={weeklyVsAi}
        t={t}
      />

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

function VsAiSection({
  locale,
  userId,
  rows,
  weekly,
  t,
}: {
  locale: string;
  userId: string;
  rows: RuntimeVsAiDuelRow[];
  weekly: RuntimeWeeklyVsAi | null;
  t: Awaited<ReturnType<typeof getTranslations<"account">>>;
}) {
  const myWeekly = weekly?.rows.find((r) => r.userId === userId);
  const aiBest = weekly?.aiBest ?? 0;
  // Mirrors the badge rule: at least AI_SLAYER_MIN_PLAYED scored picks and
  // strictly more points than every AI.
  const beatingAll =
    myWeekly != null &&
    myWeekly.played >= AI_SLAYER_MIN_PLAYED &&
    myWeekly.points > 0 &&
    myWeekly.points > aiBest;
  const ogCardUrl =
    beatingAll && weekly
      ? `/og?kind=ai-duel&t=${encodeURIComponent(t("vsAi.cardTitle"))}&s=${encodeURIComponent(
          `${weekly.weekLabel} · ${myWeekly.points} vs ${aiBest}`,
        )}&badge=${encodeURIComponent(`🏆 ${t("vsAi.badgeName")}`)}`
      : null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{t("vsAi.title")}</h2>

      {weekly && myWeekly && (
        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm">
            {t("vsAi.weeklySummary", {
              week: weekly.weekLabel,
              mine: myWeekly.points,
              ai: aiBest,
            })}{" "}
            {beatingAll ? (
              <span className="font-semibold text-[var(--brand)]">{t("vsAi.beatingAll")}</span>
            ) : (
              <span className="text-[var(--muted)]">{t("vsAi.keepGoing")}</span>
            )}
          </p>
          {beatingAll && ogCardUrl && (
            <div className="flex flex-wrap items-center gap-3">
              <ShareButtons
                url={localizedPath("/peringkat", locale)}
                text={t("vsAi.shareText")}
                compact
                contentType="leaderboard"
                contentId="you-vs-ai"
              />
              <a
                href={ogCardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[var(--brand)] underline underline-offset-2"
              >
                {t("vsAi.saveCard")}
              </a>
            </div>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("vsAi.empty")}</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {rows.map((r) => (
            <li key={r.fixtureId} className="space-y-1.5 px-4 py-3">
              <Link
                href={{ pathname: "/pertandingan/[slug]", params: { slug: r.slug } }}
                className="flex items-center justify-between gap-3 hover:text-[var(--brand)]"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {r.homeName} <span className="text-[var(--muted)]">vs</span> {r.awayName}
                </span>
                {r.homeGoals != null && r.awayGoals != null && (
                  <span className="text-sm font-bold tabular-nums">
                    {r.homeGoals}-{r.awayGoals}
                  </span>
                )}
              </Link>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                <span
                  className={`font-semibold ${
                    (r.mine.pointsAwarded ?? 0) >=
                    Math.max(0, ...r.ai.map((a) => a.pointsAwarded ?? 0))
                      ? "text-[var(--brand)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {t("vsAi.you")} {r.mine.homeGoalsPred}-{r.mine.awayGoalsPred} (+
                  {r.mine.pointsAwarded ?? 0})
                </span>
                {r.ai.map((a) => (
                  <span key={a.name}>
                    🤖{a.name} {a.homeGoalsPred}-{a.awayGoalsPred} (+{a.pointsAwarded ?? 0})
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
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
