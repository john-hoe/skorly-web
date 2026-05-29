import type { FixtureLite } from "@skorly/types";

/** Context passed into content prompts. Kept serializable for caching. */
export interface MatchContext {
  fixture: FixtureLite;
  homeForm?: string[]; // e.g. ["W","D","L","W","W"]
  awayForm?: string[];
  headToHead?: string; // summarized H2H text
  keyPlayersHome?: string[];
  keyPlayersAway?: string[];
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
