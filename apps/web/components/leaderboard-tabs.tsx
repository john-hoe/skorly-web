"use client";

/**
 * D4 — leaderboard with two tabs: the all-time board and the current ISO
 * week "you vs Skorly AI" board. Pure presentation; both datasets are
 * fetched server-side and passed in.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { RuntimeLeaderRow, RuntimeWeeklyVsAi } from "@/lib/runtime-data";

export function LeaderboardTabs({
  overall,
  weekly,
}: {
  overall: RuntimeLeaderRow[];
  weekly: RuntimeWeeklyVsAi | null;
}) {
  const t = useTranslations("leaderboard");
  const [tab, setTab] = useState<"overall" | "vsAi">("overall");

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      active
        ? "bg-[var(--brand)] text-white"
        : "bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overall"}
          className={tabClass(tab === "overall")}
          onClick={() => setTab("overall")}
        >
          {t("tabs.overall")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "vsAi"}
          className={tabClass(tab === "vsAi")}
          onClick={() => setTab("vsAi")}
        >
          {t("tabs.vsAi")}
        </button>
      </div>

      {tab === "overall" ? (
        <LeaderTable rows={overall} aiBest={null} emptyText={t("empty")} />
      ) : weekly == null ? (
        <EmptyCard text={t("vsAi.empty")} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            {t("vsAi.subtitle", { week: weekly.weekLabel, points: weekly.aiBest })}
          </p>
          {weekly.rows.length === 0 ? (
            <EmptyCard text={t("vsAi.empty")} />
          ) : (
            <LeaderTable rows={weekly.rows} aiBest={weekly.aiBest} emptyText={t("vsAi.empty")} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted)]">
      {text}
    </p>
  );
}

function LeaderTable({
  rows,
  aiBest,
  emptyText,
}: {
  rows: RuntimeLeaderRow[];
  /** When set (weekly tab), humans above this score get the "beating AI" chip. */
  aiBest: number | null;
  emptyText: string;
}) {
  const t = useTranslations("leaderboard");
  if (rows.length === 0) return <EmptyCard text={emptyText} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="px-4 py-3 w-12">{t("rank")}</th>
            <th className="px-4 py-3">{t("player")}</th>
            <th className="px-4 py-3 text-right">{t("points")}</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">{t("played")}</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">{t("exact")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const beatingAi =
              aiBest != null && !r.isAi && r.points > 0 && r.points > aiBest;
            return (
              <tr
                key={r.userId}
                className={`border-b border-[var(--border)] last:border-0 ${
                  r.isAi ? "bg-[var(--brand)]/5" : ""
                }`}
              >
                <td className="px-4 py-3 font-bold tabular-nums text-[var(--muted)]">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {r.isAi && <span aria-hidden>🤖</span>}
                    {r.isAi && r.aiSlug ? (
                      <Link
                        href={{ pathname: "/peringkat/ai/[slug]", params: { slug: r.aiSlug } }}
                        className="font-semibold text-[var(--brand)] hover:underline"
                        title={t("aiDetail.viewStrategy")}
                      >
                        {r.displayName?.trim() || t("anonymous")}
                        <span aria-hidden> ›</span>
                      </Link>
                    ) : (
                      <span>{r.displayName?.trim() || t("anonymous")}</span>
                    )}
                    {r.aiSlayerBadges > 0 && (
                      <span
                        className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600"
                        title={t("vsAi.badgeName")}
                      >
                        🏆{r.aiSlayerBadges > 1 ? `×${r.aiSlayerBadges}` : ""}
                      </span>
                    )}
                    {beatingAi && (
                      <span className="rounded-full bg-[var(--brand)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand)]">
                        {t("vsAi.beating")}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--brand)]">
                  {r.points}
                </td>
                <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                  {r.played}
                </td>
                <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                  {r.exact}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
