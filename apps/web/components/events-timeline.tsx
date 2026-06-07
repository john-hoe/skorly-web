"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getEventsApi, getLiveFixtureApi } from "@/lib/runtime-api-client";
import { isLivePollingWindow, LIVE_POLL_MS } from "@/lib/live-window";
import type { FixtureEventView } from "@skorly/db";

function icon(type: string | null, detail: string | null): string {
  const d = (detail ?? "").toLowerCase();
  if (type === "Goal") return d.includes("own") ? "⚽️" : d.includes("penalty") ? "🥅" : "⚽️";
  if (type === "Card") return d.includes("red") ? "🟥" : "🟨";
  if (type === "subst") return "🔄";
  return "•";
}

export function EventsTimeline({
  fixtureId,
  initialStatus,
  kickoffAt,
}: {
  fixtureId: number;
  initialStatus: string;
  kickoffAt: string | null;
}) {
  const t = useTranslations("scores");
  const [events, setEvents] = useState<FixtureEventView[] | null>(null);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    let active = true;
    getEventsApi(fixtureId)
      .then((e) => {
        if (active) setEvents(e);
      })
      .catch(() => {
        if (active) setEvents([]);
      });
    return () => {
      active = false;
    };
  }, [fixtureId]);

  useEffect(() => {
    if (!isLivePollingWindow(status, kickoffAt)) return;
    let active = true;
    const tick = () => {
      getLiveFixtureApi(fixtureId)
        .then((snapshot) => {
          if (!active || !snapshot) return;
          setStatus(snapshot.fixture.status);
          setEvents(snapshot.events);
        })
        .catch(() => {});
    };
    const id = setInterval(tick, LIVE_POLL_MS);
    tick();
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [fixtureId, kickoffAt, status]);

  if (events === null) {
    return <div className="h-24 animate-pulse rounded-2xl bg-[var(--card)]" aria-hidden />;
  }
  if (events.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="mb-3 font-bold">{t("timeline")}</h2>
      <ol className="space-y-2">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="w-9 shrink-0 text-right font-bold tabular-nums text-[var(--muted)]">
              {e.minute != null ? `${e.minute}'` : ""}
            </span>
            <span aria-hidden>{icon(e.type, e.detail)}</span>
            <span className="min-w-0 flex-1">
              {e.playerName && <span className="font-medium">{e.playerName}</span>}
              {e.teamName && (
                <span className="text-[var(--muted)]">
                  {e.playerName ? " · " : ""}
                  {e.teamName}
                </span>
              )}
              {e.detail && <span className="text-[var(--muted)]"> — {e.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
