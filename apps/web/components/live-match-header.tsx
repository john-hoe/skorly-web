"use client";

import { useEffect, useMemo, useState } from "react";
import { TeamBadge } from "@/components/team-badge";
import { getLiveFixtureApi } from "@/lib/runtime-api-client";
import { isLivePollingWindow, LIVE_POLL_MS } from "@/lib/live-window";
import type { LiveFixtureSummary } from "@skorly/types";

export function LiveMatchHeader({
  initial,
  matchTitle,
  kickoffLabel,
  venue,
  city,
}: {
  initial: LiveFixtureSummary;
  matchTitle: string;
  kickoffLabel: string;
  venue: string | null;
  city: string | null;
}) {
  const [fixture, setFixture] = useState<LiveFixtureSummary>(initial);

  const shouldPoll = useMemo(
    () => isLivePollingWindow(fixture.status, fixture.kickoffAt),
    [fixture.status, fixture.kickoffAt],
  );

  useEffect(() => {
    if (!shouldPoll) return;
    let active = true;
    const tick = () => {
      getLiveFixtureApi(initial.id)
        .then((snapshot) => {
          if (active && snapshot?.fixture) setFixture(snapshot.fixture);
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [initial.id, shouldPoll]);

  const hasScore =
    fixture.status === "live" ||
    fixture.status === "finished" ||
    fixture.homeGoals != null ||
    fixture.awayGoals != null;
  const score = hasScore
    ? `${fixture.homeGoals ?? 0} - ${fixture.awayGoals ?? 0}`
    : "VS";

  return (
    <header className="rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] p-6 text-white">
      <p className="text-center text-sm text-white/80">
        {fixture.groupName ?? fixture.round} &middot; {kickoffLabel}
      </p>
      <h1 className="mt-3 text-center text-2xl font-bold leading-tight">
        {matchTitle}
      </h1>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <TeamBadge
            name={fixture.home.name}
            logo={fixture.home.logo}
            code={fixture.home.code}
            size={48}
            showName={false}
          />
          <span className="text-center text-sm font-medium">{fixture.home.name}</span>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">{score}</div>
          {fixture.status === "live" && (
            <div className="mt-1 text-xs font-semibold uppercase text-white/80">
              Live{fixture.elapsed != null ? ` ${fixture.elapsed}'` : ""}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <TeamBadge
            name={fixture.away.name}
            logo={fixture.away.logo}
            code={fixture.away.code}
            size={48}
            showName={false}
          />
          <span className="text-center text-sm font-medium">{fixture.away.name}</span>
        </div>
      </div>
      {venue && (
        <p className="mt-4 text-center text-xs text-white/70">
          {venue}{city ? `, ${city}` : ""}
        </p>
      )}
    </header>
  );
}
