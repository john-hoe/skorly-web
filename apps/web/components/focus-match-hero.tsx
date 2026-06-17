"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TeamBadge } from "@/components/team-badge";
import { getLiveAllApi } from "@/lib/runtime-api-client";
import { isLivePollingWindow, LIVE_POLL_MS } from "@/lib/live-window";
import { track } from "@/lib/analytics";
import type { LiveFixtureSummary } from "@skorly/types";

export interface FocusMatchData {
  id: number;
  slug: string;
  kickoffAt: string | null;
  groupName: string | null;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  home: { name: string; logo: string | null; code: string | null };
  away: { name: string; logo: string | null; code: string | null };
  aiName: string;
  aiHome: number;
  aiAway: number;
  picksCount: number;
}

interface LiveState {
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function untilLabel(kickoff: number, now: number): string {
  const ms = Math.max(0, kickoff - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function FocusCard({
  match,
  live,
  now,
}: {
  match: FocusMatchData;
  live: LiveState | null;
  now: number | null;
}) {
  const t = useTranslations("home");
  const status = live?.status ?? match.status;
  const isLive = status === "live";
  const isFinished = status === "finished";
  const showScore = isLive || isFinished;
  const homeGoals = live?.homeGoals ?? match.homeGoals ?? 0;
  const awayGoals = live?.awayGoals ?? match.awayGoals ?? 0;
  const elapsed = live?.elapsed ?? match.elapsed;
  const kickoff = match.kickoffAt ? Date.parse(match.kickoffAt) : null;

  return (
    <div className="w-full shrink-0 snap-center px-1">
      <div className="mx-auto max-w-xl rounded-2xl bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/20">
        <div className="flex items-center justify-between text-xs text-white/75">
          <span className="font-semibold uppercase tracking-wider">{t("focusBadge")}</span>
          <span>{match.groupName ?? ""}</span>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex min-w-0 justify-end">
            <TeamBadge name={match.home.name} logo={match.home.logo} code={match.home.code} reverse />
          </div>
          <div className="shrink-0 px-2 text-center">
            {showScore ? (
              <div>
                <div className="text-3xl font-extrabold tabular-nums">
                  {homeGoals} - {awayGoals}
                </div>
                <div className="mt-0.5 text-xs font-bold">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-red-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                      {elapsed != null ? `${elapsed}'` : "LIVE"}
                    </span>
                  ) : (
                    <span className="text-white/75">{t("fullTime")}</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-extrabold tabular-nums">
                  {kickoff && now != null ? untilLabel(kickoff, now) : "--:--:--"}
                </div>
                <div className="mt-0.5 text-xs text-white/75">{t("kickoffIn")}</div>
              </div>
            )}
          </div>
          <div className="flex min-w-0 justify-start">
            <TeamBadge name={match.away.name} logo={match.away.logo} code={match.away.code} />
          </div>
        </div>

        <p className="mt-3 text-center text-sm text-white/85">
          {t("aiTeaser", { name: match.aiName, score: `${match.aiHome}-${match.aiAway}` })}
        </p>

        <div className="mt-3 flex items-center justify-center gap-3">
          <Link
            href={{ pathname: "/pertandingan/[slug]", params: { slug: match.slug } }}
            onClick={() =>
              track("focus_match_cta_click", {
                fixtureId: match.id,
                target: "match_detail",
                status,
                source: "home_focus_match",
              })
            }
            className="rounded-lg bg-white px-5 py-2 text-sm font-bold text-[var(--brand-dark)] hover:bg-white/90"
          >
            {isLive ? t("enterLive") : t("predictCta")}
          </Link>
          {match.picksCount > 0 ? (
            <span className="text-xs text-white/75">
              {t("picksCount", { count: match.picksCount })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Hero focus match — swipeable when several matches run at once (simultaneous
 * group-stage kickoffs). Native scroll-snap with dot indicators; one shared
 * /api/live poll keeps every card's score fresh.
 */
export function FocusMatchHero({ matches }: { matches: FocusMatchData[] }) {
  const [liveById, setLiveById] = useState<Map<number, LiveState>>(new Map());
  const [now, setNow] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // 1s ticker for countdowns (post-mount to stay hydration-safe).
  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const id = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  // Shared live poll once any match enters its window (post-mount only). The
  // window check reads the latest polled statuses through a ref so polling
  // actually stops once every match has finished — the build-time status prop
  // would otherwise keep a long-lived tab polling forever.
  const liveByIdRef = useRef(liveById);
  useEffect(() => {
    liveByIdRef.current = liveById;
  }, [liveById]);
  const [shouldPoll, setShouldPoll] = useState(false);
  useEffect(() => {
    const update = () =>
      setShouldPoll(
        matches.some((m) =>
          isLivePollingWindow(liveByIdRef.current.get(m.id)?.status ?? m.status, m.kickoffAt),
        ),
      );
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [matches]);

  useEffect(() => {
    if (!shouldPoll) return;
    let activeFlag = true;
    const tick = () => {
      getLiveAllApi()
        .then((snapshot) => {
          if (!activeFlag || !snapshot) return;
          setLiveById((previous) => {
            const next = new Map(previous);
            const seen = new Set<number>();
            for (const f of snapshot.fixtures as LiveFixtureSummary[]) {
              seen.add(f.id);
              next.set(f.id, {
                status: f.status,
                homeGoals: f.homeGoals,
                awayGoals: f.awayGoals,
                elapsed: f.elapsed,
              });
            }
            // A match we saw live that dropped out of live:all has ended.
            for (const [id, state] of next) {
              if (state.status === "live" && !seen.has(id)) {
                next.set(id, { ...state, status: "finished", elapsed: null });
              }
            }
            return next;
          });
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => {
      activeFlag = false;
      clearInterval(id);
    };
  }, [shouldPoll]);

  if (!matches.length) return null;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const scrollTo = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="mt-5">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className={`flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          matches.length > 1 ? "" : "justify-center"
        }`}
      >
        {matches.map((match) => (
          <FocusCard key={match.id} match={match} live={liveById.get(match.id) ?? null} now={now} />
        ))}
      </div>
      {matches.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {matches.map((match, index) => (
            <button
              key={match.id}
              type="button"
              aria-label={`${match.home.name} vs ${match.away.name}`}
              onClick={() => scrollTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === active ? "w-5 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
