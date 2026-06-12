"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getLiveFixtureApi } from "@/lib/runtime-api-client";
import { isLivePollingWindow, LIVE_POLL_MS } from "@/lib/live-window";
import type { LiveStatsSample, LiveStatsSnapshot } from "@skorly/types";

function StatBar({
  label,
  home,
  away,
  suffix = "",
}: {
  label: string;
  home: number | null;
  away: number | null;
  suffix?: string;
}) {
  if (home == null || away == null) return null;
  const total = home + away;
  const homePct = total > 0 ? (home / total) * 100 : 50;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
        <span>
          {home}
          {suffix}
        </span>
        <span className="text-[var(--muted)]">{label}</span>
        <span>
          {away}
          {suffix}
        </span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="bg-[var(--brand)]" style={{ width: `${homePct}%` }} />
        <div className="bg-slate-400" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

/**
 * Momentum estimate from the rolling shots history: which side has created
 * more shots over the recent samples (~last 10 minutes). Explicitly labelled
 * an estimate — every underlying number is real, the blend is ours.
 */
function momentum(history: LiveStatsSample[]): number | null {
  if (history.length < 2) return null;
  const recent = history.slice(-4);
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  if (
    first.shotsHome == null ||
    first.shotsAway == null ||
    last.shotsHome == null ||
    last.shotsAway == null
  ) {
    return null;
  }
  const deltaHome = last.shotsHome - first.shotsHome;
  const deltaAway = last.shotsAway - first.shotsAway;
  const total = deltaHome + deltaAway;
  if (total <= 0) return 50;
  return Math.round((deltaHome / total) * 100);
}

export function LiveStatsPanel({
  fixtureId,
  homeName,
  awayName,
  initialStatus,
  kickoffAt,
}: {
  fixtureId: number;
  homeName: string;
  awayName: string;
  initialStatus: string;
  kickoffAt: string | null;
}) {
  const t = useTranslations("matchCenter");
  const [stats, setStats] = useState<LiveStatsSnapshot | null>(null);
  const [history, setHistory] = useState<LiveStatsSample[]>([]);
  const [status, setStatus] = useState(initialStatus);

  // Post-mount only — see LiveCommentaryFeed for the hydration rationale.
  const [shouldPoll, setShouldPoll] = useState(false);
  useEffect(() => {
    const update = () => setShouldPoll(isLivePollingWindow(status, kickoffAt));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [status, kickoffAt]);

  useEffect(() => {
    if (!shouldPoll) return;
    let active = true;
    const tick = () => {
      getLiveFixtureApi(fixtureId)
        .then((snapshot) => {
          if (!active || !snapshot?.fixture) return;
          setStatus(snapshot.fixture.status);
          if (snapshot.stats) setStats(snapshot.stats);
          if (snapshot.statsHistory) setHistory(snapshot.statsHistory);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [fixtureId, shouldPoll]);

  if (!stats) return null;

  const mom = momentum(history);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{t("statsTitle")}</h2>
      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="truncate">{homeName}</span>
          <span className="truncate text-right">{awayName}</span>
        </div>
        <StatBar label={t("possession")} home={stats.possessionHome} away={stats.possessionAway} suffix="%" />
        <StatBar label={t("shots")} home={stats.shotsHome} away={stats.shotsAway} />
        <StatBar label={t("shotsOnTarget")} home={stats.shotsOnHome} away={stats.shotsOnAway} />
        <StatBar label={t("corners")} home={stats.cornersHome} away={stats.cornersAway} />
        <StatBar label={t("fouls")} home={stats.foulsHome} away={stats.foulsAway} />
        {mom != null ? (
          <div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--muted)]">{t("momentum")}</span>
              <span className="text-[10px] text-[var(--muted)]">{t("momentumNote")}</span>
            </div>
            <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-[var(--border)]">
              <div className="bg-[var(--brand)] transition-all duration-700" style={{ width: `${mom}%` }} />
              <div className="bg-slate-400 transition-all duration-700" style={{ width: `${100 - mom}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
