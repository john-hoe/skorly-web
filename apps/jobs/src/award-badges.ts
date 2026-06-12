/**
 * D4 「你 vs AI」 — weekly "AI slayer" badge award.
 *
 * Once the previous ISO week (Mon 00:00 UTC → next Mon) is over, every human
 * player who (a) had at least MIN_PLAYED scored predictions that week and
 * (b) out-scored ALL four Skorly AI predictors gets a persistent badge in
 * profiles.badges. Idempotent: badge ids embed the week, appendProfileBadge
 * skips duplicates, and a KV marker short-circuits repeat runs.
 */
import {
  appendProfileBadge,
  getProfileIdsByEmails,
  getScoredTotalsBetween,
  type ScoredTotalsRow,
} from "@skorly/db";
import { AI_PREDICTOR_EMAILS, isoWeekBefore, isoWeekContaining } from "@skorly/types";

export const MIN_PLAYED = 3;

const KV_MARKER_PREFIX = "badges:ai-slayer:";
const KV_MARKER_TTL_S = 30 * 24 * 60 * 60;

interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export const previousIsoWeek = isoWeekBefore;
export const currentIsoWeek = isoWeekContaining;

/**
 * Pure selection: human users who played enough and strictly beat every AI.
 * Returns null when no AI account scored that week (nothing to beat).
 */
export function selectAiSlayers(
  totals: ScoredTotalsRow[],
  aiUserIds: Set<string>,
  minPlayed = MIN_PLAYED,
): { aiBest: number; winners: ScoredTotalsRow[] } | null {
  const aiRows = totals.filter((t) => aiUserIds.has(t.userId));
  if (aiRows.length === 0) return null;
  const aiBest = Math.max(...aiRows.map((t) => t.points));
  const winners = totals.filter(
    (t) => !aiUserIds.has(t.userId) && t.played >= minPlayed && t.points > aiBest,
  );
  return { aiBest, winners };
}

export interface AwardBadgesResult {
  ok: boolean;
  skipped: boolean;
  week: string;
  winners: number;
  awarded: number;
  aiBest: number | null;
}

export async function awardAiSlayerBadges(opts: {
  kv?: KvLike | null;
  now?: Date;
}): Promise<AwardBadgesResult> {
  const week = previousIsoWeek(opts.now ?? new Date());
  const base: AwardBadgesResult = {
    ok: true,
    skipped: false,
    week: week.label,
    winners: 0,
    awarded: 0,
    aiBest: null,
  };

  const markerKey = `${KV_MARKER_PREFIX}${week.label}`;
  if (opts.kv && (await opts.kv.get(markerKey))) {
    return { ...base, skipped: true };
  }

  const [totals, aiProfiles] = await Promise.all([
    getScoredTotalsBetween(week.start, week.end),
    getProfileIdsByEmails([...AI_PREDICTOR_EMAILS]),
  ]);
  const aiIds = new Set(aiProfiles.map((p) => p.id));
  const selection = selectAiSlayers(totals, aiIds);
  if (!selection) {
    // No scored AI picks that week (e.g. before tournament) — mark and move on.
    if (opts.kv) await opts.kv.put(markerKey, "no-ai", { expirationTtl: KV_MARKER_TTL_S });
    return { ...base, skipped: true };
  }

  let awarded = 0;
  for (const winner of selection.winners) {
    const added = await appendProfileBadge(winner.userId, {
      id: `ai_slayer:${week.label}`,
      kind: "ai_slayer",
      week: week.label,
      points: winner.points,
      awardedAt: new Date().toISOString(),
    }).catch((e) => {
      console.error(`[award-badges] append failed for ${winner.userId}`, e);
      return false;
    });
    if (added) awarded++;
  }

  if (opts.kv) await opts.kv.put(markerKey, "done", { expirationTtl: KV_MARKER_TTL_S });
  if (selection.winners.length) {
    console.log(
      `[award-badges] ${week.label}: aiBest=${selection.aiBest}, winners=${selection.winners.length}, newly awarded=${awarded}`,
    );
  }
  return {
    ...base,
    winners: selection.winners.length,
    awarded,
    aiBest: selection.aiBest,
  };
}
