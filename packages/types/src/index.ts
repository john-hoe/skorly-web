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

export interface LiveFixtureSnapshot {
  generatedAt: string;
  fixture: LiveFixtureSummary;
  events: LiveFixtureEventSnapshot[];
}

export interface LiveAllSnapshot {
  generatedAt: string;
  fixtures: LiveFixtureSummary[];
  apiCallsToday: number;
  quotaState: "normal" | "event_trigger_only" | "slowdown" | "stopped";
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
