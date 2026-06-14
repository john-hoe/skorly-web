/** Shared domain types used across web, jobs and ai-content. */

export type Locale = "id" | "vi" | "en" | "zh";

export const ARTICLE_TYPES = [
  "preview",
  "watchpoints",
  "prediction",
  "recap",
  "tactical",
  "group_analysis",
] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export type FixtureStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type CampaignType = "subscribe" | "predict" | "lottery" | "referral";

export interface TeamLite {
  apiId: number;
  name: string;
  slug: string;
  code?: string | null;
  logo?: string | null;
}

export interface FixtureLite {
  apiId: number;
  slug: string;
  groupName?: string | null;
  stage?: string | null;
  kickoffAt?: string | null;
  home: TeamLite;
  away: TeamLite;
  status: FixtureStatus;
  homeGoals?: number | null;
  awayGoals?: number | null;
}

export interface LiveTeamSnapshot {
  id: number | null;
  name: string;
  slug: string;
  code: string | null;
  logo: string | null;
}

export interface LiveFixtureSummary {
  id: number;
  apiId: number;
  slug: string;
  round: string | null;
  groupName: string | null;
  kickoffAt: string | null;
  status: FixtureStatus;
  elapsed: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  home: LiveTeamSnapshot;
  away: LiveTeamSnapshot;
}

export interface LiveFixtureEventSnapshot {
  minute: number | null;
  type: string | null;
  detail: string | null;
  teamId: number | null;
  teamName: string | null;
  playerName: string | null;
}

/** Head-to-head live technical statistics (subset of /fixtures/statistics). */
export interface LiveStatsSnapshot {
  updatedAt: string;
  possessionHome: number | null;
  possessionAway: number | null;
  shotsHome: number | null;
  shotsAway: number | null;
  shotsOnHome: number | null;
  shotsOnAway: number | null;
  cornersHome: number | null;
  cornersAway: number | null;
  foulsHome: number | null;
  foulsAway: number | null;
}

/** Rolling sample used by the client-side momentum gauge. */
export interface LiveStatsSample {
  at: string;
  elapsed: number | null;
  shotsHome: number | null;
  shotsAway: number | null;
}

/** One live text-commentary entry; texts keyed by locale. */
export interface LiveCommentaryEntry {
  /** Stable dedupe key, also used to merge snapshot updates client-side. */
  key: string;
  sortKey: number;
  minute: number | null;
  type: string;
  texts: Record<string, string>;
}

export interface LiveFixtureSnapshot {
  generatedAt: string;
  fixture: LiveFixtureSummary;
  events: LiveFixtureEventSnapshot[];
  /** Raw API status short code (e.g. HT, FT) for richer commentary states. */
  statusShort?: string | null;
  stats?: LiveStatsSnapshot | null;
  statsHistory?: LiveStatsSample[];
  commentary?: LiveCommentaryEntry[];
}

export interface LiveAllSnapshot {
  generatedAt: string;
  fixtures: LiveFixtureSummary[];
  apiCallsToday: number;
  quotaState: "normal" | "event_trigger_only" | "slowdown" | "stopped";
}

/** Prediction strategy each Skorly AI persona follows. */
export type AiPredictorStrategy = "model" | "sampled" | "upset" | "cautious";

/** One "Skorly AI" predictor account's public metadata. */
export interface AiPredictorMeta {
  /** URL slug for the public detail page, e.g. "elo". */
  slug: string;
  /** Seed auth email — the stable join key to the profiles row. */
  email: string;
  /** Display name shown on the leaderboard, e.g. "Skorly AI · Elo". */
  name: string;
  strategy: AiPredictorStrategy;
}

/**
 * The four "Skorly AI" predictor accounts (seeded by
 * apps/jobs/scripts/seed-ai-predictors.ts). Single source of truth shared by
 * jobs (prediction generation), web (AI detection + the public detail page)
 * and the badge job.
 */
export const AI_PREDICTORS: AiPredictorMeta[] = [
  { slug: "elo", email: "ai-elo@skorly.cc", name: "Skorly AI · Elo", strategy: "model" },
  { slug: "poisson", email: "ai-poisson@skorly.cc", name: "Skorly AI · Poisson", strategy: "sampled" },
  { slug: "brave", email: "ai-brave@skorly.cc", name: "Skorly AI · Brave", strategy: "upset" },
  { slug: "cautious", email: "ai-cautious@skorly.cc", name: "Skorly AI · Cautious", strategy: "cautious" },
];

/** Emails of the four AI predictor accounts (derived; single source above). */
export const AI_PREDICTOR_EMAILS: string[] = AI_PREDICTORS.map((p) => p.email);

export function aiPredictorByEmail(email: string | null | undefined): AiPredictorMeta | undefined {
  if (!email) return undefined;
  return AI_PREDICTORS.find((p) => p.email === email);
}

export function aiPredictorBySlug(slug: string): AiPredictorMeta | undefined {
  return AI_PREDICTORS.find((p) => p.slug === slug);
}

/** Minimum scored predictions in a week to qualify for the AI Slayer badge. */
export const AI_SLAYER_MIN_PLAYED = 3;

/** One badge entry inside profiles.badges (jsonb array). */
export interface ProfileBadge {
  /** Unique per award, e.g. "ai_slayer:2026-W25". */
  id: string;
  kind: "ai_slayer";
  /** ISO week the badge was earned for, e.g. "2026-W25". */
  week: string;
  /** Weekly points the user scored when earning it. */
  points: number;
  awardedAt: string;
}

/** ISO week label (e.g. "2026-W25") plus its [start, end) UTC window. */
export interface IsoWeekWindow {
  label: string;
  start: Date;
  end: Date;
}

function startOfIsoWeekUtc(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = out.getUTCDay(); // 0=Sun..6=Sat
  out.setUTCDate(out.getUTCDate() - ((day + 6) % 7));
  return out;
}

function isoWeekLabel(weekStart: Date): string {
  // ISO week number = week containing that week's Thursday.
  const thursday = new Date(weekStart);
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Start = startOfIsoWeekUtc(jan4);
  const week = 1 + Math.round((weekStart.getTime() - week1Start.getTime()) / (7 * 86400000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The ISO week (Mon 00:00 UTC → next Mon) containing `now`. */
export function isoWeekContaining(now: Date = new Date()): IsoWeekWindow {
  const start = startOfIsoWeekUtc(now);
  return { label: isoWeekLabel(start), start, end: new Date(start.getTime() + 7 * 86400000) };
}

/** The most recent fully-completed ISO week before `now`. */
export function isoWeekBefore(now: Date = new Date()): IsoWeekWindow {
  const currentStart = startOfIsoWeekUtc(now);
  const start = new Date(currentStart.getTime() - 7 * 86400000);
  return { label: isoWeekLabel(start), start, end: currentStart };
}

/** Result of one content-QA pass, stored in articles.qa_log. */
export interface QaRound {
  round: number;
  model: string;
  fluency: number;
  factual: number;
  seo: number;
  overall: number;
  notes?: string;
}
