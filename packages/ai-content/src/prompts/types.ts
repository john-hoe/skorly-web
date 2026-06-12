import type { FixtureLite } from "@skorly/types";

/** In-house Elo/Poisson forecast snapshot injected into prediction prompts. */
export interface MatchForecastContext {
  /** Outcome probabilities as integer percentages, summing to 100. */
  probabilities: { homeWin: number; draw: number; awayWin: number };
  /** Single most likely exact scoreline — the article MUST use this. */
  mostLikelyScore: { home: number; away: number };
  /** Top exact scorelines by probability (percentages). */
  topScores: Array<{ home: number; away: number; prob: number }>;
  /** 0..1 — how much real data backs the model (low before results exist). */
  confidence: number;
}

/** Context passed into content prompts. Kept serializable for caching. */
export interface MatchContext {
  fixture: FixtureLite;
  homeForm?: string[]; // e.g. ["W","D","L","W","W"]
  awayForm?: string[];
  headToHead?: string; // summarized H2H text
  keyPlayersHome?: string[];
  keyPlayersAway?: string[];
  /** When present, the prediction article is grounded in the model output. */
  forecast?: MatchForecastContext;
}

export interface GroupContext {
  groupName: string;
  teams: string[];
  standingsSummary?: string;
}

export interface PromptResult {
  system: string;
  user: string;
}
