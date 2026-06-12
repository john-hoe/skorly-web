"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLiveAllApi } from "@/lib/runtime-api-client";
import { LIVE_POLL_MS } from "@/lib/live-window";
import type { LiveFixtureSummary } from "@skorly/types";

export interface NextMatchTeaser {
  slug: string;
  kickoffAt: string | null;
  homeName: string;
  awayName: string;
}

const SOON_WINDOW_MS = 12 * 60 * 60 * 1000;

function kickoffLabel(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Top-of-page strip surfacing matches that are live right now (polled from the
 * KV-backed /api/live, so it stays fresh on a fully static page) or, failing
 * that, the next match kicking off within 12 hours.
 */
export function LiveNowBanner({ next }: { next: NextMatchTeaser | null }) {
  const t = useTranslations("home");
  const [live, setLive] = useState<LiveFixtureSummary[]>([]);

  useEffect(() => {
    let active = true;
    const tick = () => {
      getLiveAllApi()
        .then((snapshot) => {
          if (!active) return;
          setLive((snapshot?.fixtures ?? []).filter((f) => f.status === "live"));
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (live.length > 0) {
    return (
      <div className="bg-[#0f1720] text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            {t("liveNow")}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
            {live.slice(0, 2).map((f) => (
              <Link
                key={f.id}
                href={{ pathname: "/pertandingan/[slug]", params: { slug: f.slug } }}
                className="group flex min-w-0 items-center gap-2 text-sm hover:text-[#bbf7d0]"
              >
                <span className="truncate font-semibold">{f.home.name}</span>
                <span className="shrink-0 rounded bg-white/15 px-2 py-0.5 font-bold tabular-nums">
                  {f.homeGoals ?? 0} - {f.awayGoals ?? 0}
                </span>
                <span className="truncate font-semibold">{f.away.name}</span>
                {f.elapsed != null ? (
                  <span className="shrink-0 text-xs font-bold text-red-400 tabular-nums">
                    {f.elapsed}&prime;
                  </span>
                ) : null}
                <span className="shrink-0 text-xs text-white/60 group-hover:text-[#bbf7d0]">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (next?.kickoffAt) {
    // Intentional render-time clock read: the page is statically generated and
    // rebuilt every ~30min on match days, so the boundary drift is acceptable.
    // eslint-disable-next-line react-hooks/purity
    const ms = new Date(next.kickoffAt).getTime() - Date.now();
    if (ms > 0 && ms <= SOON_WINDOW_MS) {
      return (
        <div className="bg-[#0f1720] text-white">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
            <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-amber-300">
              {t("startingSoon")}
            </span>
            <Link
              href={{ pathname: "/pertandingan/[slug]", params: { slug: next.slug } }}
              className="group flex min-w-0 items-center gap-2 text-sm hover:text-[#bbf7d0]"
            >
              <span className="truncate font-semibold">
                {next.homeName} vs {next.awayName}
              </span>
              <span className="shrink-0 rounded bg-white/15 px-2 py-0.5 text-xs font-bold tabular-nums">
                {kickoffLabel(next.kickoffAt)}
              </span>
              <span className="shrink-0 text-xs text-white/60 group-hover:text-[#bbf7d0]">→</span>
            </Link>
          </div>
        </div>
      );
    }
  }

  return null;
}
