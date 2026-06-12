"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLiveAllApi } from "@/lib/runtime-api-client";
import { isLivePollingWindow, LIVE_POLL_MS } from "@/lib/live-window";

export interface HomeLiveMatch {
  id: number;
  slug: string;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
}

/**
 * "Live now" block at the top of the homepage main column. Server renders the
 * build-time live list; the client keeps it fresh from /api/live and hides
 * the section entirely when nothing is on.
 */
export function HomeLiveSection({
  initialLive,
  nextKickoffAt,
}: {
  initialLive: HomeLiveMatch[];
  nextKickoffAt: string | null;
}) {
  const t = useTranslations("home");
  const [matches, setMatches] = useState<HomeLiveMatch[]>(initialLive);

  const [shouldPoll, setShouldPoll] = useState(false);
  useEffect(() => {
    const update = () =>
      setShouldPoll(
        initialLive.length > 0 || isLivePollingWindow("scheduled", nextKickoffAt),
      );
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [initialLive.length, nextKickoffAt]);

  useEffect(() => {
    if (!shouldPoll) return;
    let active = true;
    const tick = () => {
      getLiveAllApi()
        .then((snapshot) => {
          if (!active || !snapshot) return;
          setMatches(
            snapshot.fixtures
              .filter((f) => f.status === "live")
              .map((f) => ({
                id: f.id,
                slug: f.slug,
                homeName: f.home.name,
                awayName: f.away.name,
                homeGoals: f.homeGoals,
                awayGoals: f.awayGoals,
                elapsed: f.elapsed,
              })),
          );
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [shouldPoll]);

  if (!matches.length) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xl font-semibold">{t("liveSectionTitle")}</h2>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {matches.map((m) => (
          <Link
            key={m.id}
            href={{ pathname: "/pertandingan/[slug]", params: { slug: m.slug } }}
            className="block rounded-xl border border-[var(--brand)]/40 bg-[var(--card)] p-4 transition hover:border-[var(--brand)] hover:shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-red-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                {m.elapsed != null ? `${m.elapsed}'` : "LIVE"}
              </span>
              <span className="font-semibold text-[var(--brand)]">{t("enterLive")} →</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm font-semibold">
              <span className="truncate">{m.homeName}</span>
              <span className="rounded bg-[var(--brand)]/10 px-2 py-0.5 font-bold tabular-nums text-[var(--brand)]">
                {m.homeGoals ?? 0} - {m.awayGoals ?? 0}
              </span>
              <span className="truncate">{m.awayName}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
