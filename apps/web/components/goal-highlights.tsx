"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getEventsApi } from "@/lib/runtime-api-client";
import { SocialEmbed } from "@/components/social-embed";
import type { FixtureEventView } from "@skorly/db";

function isGoal(e: FixtureEventView): boolean {
  if (e.type !== "Goal") return false;
  // Exclude "Missed Penalty" — only count goals that changed the score.
  return !(e.detail ?? "").toLowerCase().includes("missed");
}

/**
 * 二期 M6 — goal highlights for finished matches: a goals-only text timeline
 * plus officially-sourced video embeds (recap article `embeds`). Compliance:
 * we never self-host clips — only embed official/authorized YouTube/X sources.
 */
export function GoalHighlights({
  fixtureId,
  embeds,
}: {
  fixtureId: number;
  embeds: string[];
}) {
  const t = useTranslations("match");
  const [events, setEvents] = useState<FixtureEventView[] | null>(null);

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

  const goals = (events ?? []).filter(isGoal);
  const hasVideo = embeds.length > 0;

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
          {embeds.map((u) => (
            <SocialEmbed key={u} url={u} />
          ))}
        </div>
      )}
    </section>
  );
}
