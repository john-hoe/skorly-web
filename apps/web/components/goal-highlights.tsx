"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getEventsApi, getLiveFixtureApi } from "@/lib/runtime-api-client";
import { isLivePollingWindow, LIVE_POLL_MS } from "@/lib/live-window";
import { SocialEmbed } from "@/components/social-embed";
import type { FixtureEventView } from "@skorly/db";

function isGoal(e: FixtureEventView): boolean {
  if (e.type !== "Goal") return false;
  // Exclude "Missed Penalty" — only count goals that changed the score.
  return !(e.detail ?? "").toLowerCase().includes("missed");
}

export interface HighlightVideo {
  url: string;
  /** Rights holders like FIFA block third-party embeds → link-out card. */
  embeddable: boolean;
  title?: string | null;
}

/**
 * 二期 M6 — goal highlights for finished matches: a goals-only text timeline
 * plus officially-sourced video embeds (recap article `embeds`). Compliance:
 * we never self-host clips — only embed official/authorized YouTube/X sources.
 */
export function GoalHighlights({
  fixtureId,
  videos,
  initialStatus,
  kickoffAt,
}: {
  fixtureId: number;
  videos: HighlightVideo[];
  initialStatus: string;
  kickoffAt: string | null;
}) {
  const t = useTranslations("match");
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

  const goals = (events ?? []).filter(isGoal);
  const hasVideo = videos.length > 0;

  // Nothing to show yet (still loading) — render nothing to avoid layout jump.
  if (events === null && !hasVideo) return null;
  // Loaded, but no goals and no video — skip the section entirely.
  if (events !== null && goals.length === 0 && !hasVideo) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="text-xl font-bold">{t("highlights")}</h2>

      {goals.length > 0 ? (
        <ol className="space-y-2">
          {goals.map((g, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="w-9 shrink-0 text-right font-bold tabular-nums text-[var(--brand)]">
                {g.minute != null ? `${g.minute}'` : ""}
              </span>
              <span aria-hidden>⚽️</span>
              <span className="min-w-0 flex-1">
                {g.playerName && <span className="font-medium">{g.playerName}</span>}
                {g.teamName && (
                  <span className="text-[var(--muted)]">
                    {g.playerName ? " · " : ""}
                    {g.teamName}
                  </span>
                )}
                {g.detail && <span className="text-[var(--muted)]"> — {g.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      ) : events !== null ? (
        <p className="text-sm text-[var(--muted)]">{t("noGoals")}</p>
      ) : null}

      {hasVideo && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[var(--muted)]">
            {t("officialVideo")}
          </h3>
          {videos.map((v) =>
            v.embeddable ? (
              <SocialEmbed key={v.url} url={v.url} />
            ) : (
              <VideoLinkOutCard key={v.url} video={v} label={t("watchOnYoutube")} />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  return m?.[1] ?? null;
}

/**
 * Fallback when the rights holder blocks third-party embedding: official
 * thumbnail + link out to YouTube instead of a broken player.
 */
function VideoLinkOutCard({ video, label }: { video: HighlightVideo; label: string }) {
  const id = youtubeId(video.url);
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group relative my-6 block w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: "16 / 9" }}
    >
      {id && (
        // eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail, no optimization needed
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt={video.title ?? "Official highlights"}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-60"
        />
      )}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 text-white">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 pl-1 text-2xl shadow-lg">
          ▶
        </span>
        <span className="rounded-full bg-black/60 px-4 py-1.5 text-sm font-semibold">
          {label} ↗
        </span>
      </span>
    </a>
  );
}
