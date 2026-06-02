import type { QaRound } from "@skorly/types";

export const QUALITY_THRESHOLD = 8;
export const MAX_REGENERATIONS = 1;

export interface GateDecision {
  status: "published" | "draft";
  score: number;
  reason: string;
}

/**
 * Threshold gate. Publishes only if overall >= threshold AND back-translation
 * preserved key entities. Otherwise caller regenerates (up to MAX_REGENERATIONS)
 * then files as draft (never blocks launch, never auto-publishes low quality).
 */
export function decide(
  judgeResult: QaRound,
  backTranslateOk: boolean,
  attempt: number
): GateDecision {
  if (!backTranslateOk) {
    return {
      status: "draft",
      score: judgeResult.overall,
      reason: "back-translation lost key entities (possible garbling/drift)",
    };
  }
  if (judgeResult.overall >= QUALITY_THRESHOLD) {
    return { status: "published", score: judgeResult.overall, reason: "passed gate" };
  }
  if (attempt >= MAX_REGENERATIONS) {
    return {
      status: "draft",
      score: judgeResult.overall,
      reason: `below ${QUALITY_THRESHOLD} after ${attempt + 1} attempts`,
    };
  }
  return {
    status: "draft",
    score: judgeResult.overall,
    reason: "needs regeneration",
  };
}

export function shouldRegenerate(decision: GateDecision, attempt: number): boolean {
  return (
    decision.status === "draft" &&
    decision.reason === "needs regeneration" &&
    attempt < MAX_REGENERATIONS
  );
}
