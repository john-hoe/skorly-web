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
