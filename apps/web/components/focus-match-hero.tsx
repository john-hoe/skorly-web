"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TeamBadge } from "@/components/team-badge";
import { getLiveFixtureApi } from "@/lib/runtime-api-client";
import { LIVE_POLL_MS } from "@/lib/live-window";
import type { LiveFixtureSummary } from "@skorly/types";

export interface FocusMatchData {
  id: number;
  slug: string;
  kickoffAt: string | null;
  groupName: string | null;
  home: { name: string; logo: string | null; code: string | null };
  away: { name: string; logo: string | null; code: string | null };
  aiName: string;
  aiHome: number;
  aiAway: number;
  picksCount: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function untilParts(kickoff: number) {
  const ms = Math.max(0, kickoff - Date.now());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, label: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

/**
 * Hero centerpiece: the next (or currently live) focus match. Counts down to
 * kickoff while scheduled, then flips to the live score by polling the
 * KV-backed /api/live route. Includes the AI predictor's pick as a hook and a
 * predict CTA. Page stays fully static — everything dynamic is client-side.
 */
export function FocusMatchHero({ match }: { match: FocusMatchData }) {
  const t = useTranslations("home");
  const kickoff = useMemo(
    () => (match.kickoffAt ? new Date(match.kickoffAt).getTime() : null),
    [match.kickoffAt],
  );
  const [now, setNow] = useState<number | null>(null);
  const [live, setLive] = useState<LiveFixtureSummary | null>(null);

  // 1s ticker for the countdown (starts after mount to avoid hydration drift).
  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const id = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  // Poll live state once we're inside the match window.
  const inWindow = now != null && kickoff != null && now >= kickoff - 10 * 60 * 1000;
  useEffect(() => {
    if (!inWindow) return;
    let active = true;
    const tick = () => {
      getLiveFixtureApi(match.id)
        .then((snapshot) => {
          if (active && snapshot?.fixture) setLive(snapshot.fixture);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [inWindow, match.id]);

  const isLive = live?.status === "live";
  const isFinished = live?.status === "finished";
  const showScore = isLive || isFinished;
  const countdown = !showScore && kickoff && now != null ? untilParts(kickoff) : null;

  return (
    <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/20">
      <div className="flex items-center justify-between text-xs text-white/75">
        <span className="font-semibold uppercase tracking-wider">{t("focusBadge")}</span>
        <span>{match.groupName ?? ""}</span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex justify-end">
          <TeamBadge name={match.home.name} logo={match.home.logo} code={match.home.code} reverse />
        </div>
        <div className="px-2 text-center">
          {showScore ? (
            <div>
              <div className="text-3xl font-extrabold tabular-nums">
                {live?.homeGoals ?? 0} - {live?.awayGoals ?? 0}
              </div>
              <div className="mt-0.5 text-xs font-bold">
                {isLive ? (
                  <span className="inline-flex items-center gap-1 text-red-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                    {live?.elapsed != null ? `${live.elapsed}'` : "LIVE"}
                  </span>
                ) : (
                  <span className="text-white/75">{t("fullTime")}</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-extrabold tabular-nums">
                {countdown ? countdown.label : "--:--:--"}
              </div>
              <div className="mt-0.5 text-xs text-white/75">{t("kickoffIn")}</div>
            </div>
          )}
        </div>
        <div className="flex justify-start">
          <TeamBadge name={match.away.name} logo={match.away.logo} code={match.away.code} />
        </div>
      </div>

      <p className="mt-3 text-center text-sm text-white/85">
        {t("aiTeaser", {
          name: match.aiName,
          score: `${match.aiHome}-${match.aiAway}`,
        })}
      </p>

      <div className="mt-3 flex items-center justify-center gap-3">
        <Link
          href={{ pathname: "/pertandingan/[slug]", params: { slug: match.slug } }}
          className="rounded-lg bg-white px-5 py-2 text-sm font-bold text-[var(--brand-dark)] hover:bg-white/90"
        >
          {t("predictCta")}
        </Link>
        {match.picksCount > 0 ? (
          <span className="text-xs text-white/75">
            {t("picksCount", { count: match.picksCount })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
