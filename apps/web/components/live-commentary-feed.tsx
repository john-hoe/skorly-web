"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getLiveFixtureApi } from "@/lib/runtime-api-client";
import { isLivePollingWindow, LIVE_POLL_MS } from "@/lib/live-window";
import type { LiveCommentaryEntry } from "@skorly/types";

const TYPE_ACCENT: Record<string, string> = {
  goal: "border-l-[var(--brand)] bg-[var(--brand)]/5",
  color: "border-l-[var(--brand)]/60",
  red_card: "border-l-red-500 bg-red-500/5",
  yellow_card: "border-l-amber-400",
  fulltime: "border-l-slate-500 bg-slate-500/5",
  kickoff: "border-l-slate-400",
  halftime: "border-l-slate-400",
  second_half: "border-l-slate-400",
  stats: "border-l-sky-400",
};

function entryText(entry: LiveCommentaryEntry, locale: string): string {
  return entry.texts[locale] ?? entry.texts.en ?? Object.values(entry.texts)[0] ?? "";
}

/**
 * Live text-commentary feed. Server passes the entries known at build time;
 * within the live window the feed polls the KV-backed /api/live route and
 * merges in fresh entries (newest on top, brief highlight on arrival).
 */
export function LiveCommentaryFeed({
  fixtureId,
  locale,
  initialStatus,
  kickoffAt,
  initialEntries,
}: {
  fixtureId: number;
  locale: string;
  initialStatus: string;
  kickoffAt: string | null;
  initialEntries: LiveCommentaryEntry[];
}) {
  const t = useTranslations("matchCenter");
  const [entries, setEntries] = useState<LiveCommentaryEntry[]>(initialEntries);
  const [status, setStatus] = useState(initialStatus);
  const freshKeys = useRef<Set<string>>(new Set());

  // Computed after mount only: the page is built ahead of time, so evaluating
  // the time-based polling window during render would make the server and
  // client first paint diverge around the window boundary (hydration error).
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
          const incoming = snapshot.commentary ?? [];
          if (!incoming.length) return;
          setEntries((current) => {
            const byKey = new Map(current.map((entry) => [entry.key, entry]));
            for (const entry of incoming) {
              if (!byKey.has(entry.key)) freshKeys.current.add(entry.key);
              byKey.set(entry.key, entry);
            }
            return [...byKey.values()].sort((a, b) => a.sortKey - b.sortKey);
          });
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

  if (!entries.length && !shouldPoll) return null;

  const newestFirst = [...entries].reverse();

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">{t("commentaryTitle")}</h2>
        {status === "live" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            LIVE
          </span>
        ) : null}
      </div>
      {entries.length ? (
        <ol className="space-y-2">
          {newestFirst.map((entry) => {
            const isFresh = freshKeys.current.has(entry.key);
            return (
              <li
                key={entry.key}
                className={`flex gap-3 rounded-lg border border-[var(--border)] border-l-4 bg-[var(--card)] px-3 py-2 text-sm leading-6 ${
                  TYPE_ACCENT[entry.type] ?? "border-l-[var(--border)]"
                } ${isFresh ? "animate-[pulse_1.2s_ease-in-out_1]" : ""}`}
              >
                <span className="w-9 shrink-0 pt-0.5 text-right text-xs font-bold tabular-nums text-[var(--muted)]">
                  {entry.minute != null ? `${entry.minute}'` : ""}
                </span>
                <p className={entry.type === "color" ? "italic text-[var(--muted)]" : ""}>
                  {entryText(entry, locale)}
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
          {t("commentaryWaiting")}
        </p>
      )}
    </section>
  );
}
