/** Minimal subset of API-Football v3 response shapes we consume. */

export interface ApiResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[];
  results: number;
  paging: { current: number; total: number };
  response: T;
}

export interface AfTeam {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string;
    logo: string;
    national: boolean;
  };
}

export interface AfFixture {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    venue: { name: string | null; city: string | null };
    status: { short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
}

export interface AfFixtureEvent {
  time: {
    elapsed: number | null;
    extra: number | null;
  };
  team: {
    id: number | null;
    name: string | null;
    logo: string | null;
  };
  player: {
    id: number | null;
    name: string | null;
  };
  assist: {
    id: number | null;
    name: string | null;
  };
  type: string | null;
  detail: string | null;
  comments: string | null;
}

export interface AfPlayer {
  player: {
    id: number;
    name: string;
    age: number | null;
    nationality: string | null;
    photo: string | null;
  };
  statistics?: Array<{
    games: { position: string | null; number: number | null };
  }>;
}

export interface AfStandingRow {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export interface AfStandingsLeague {
  league: {
    id: number;
    name: string;
    season: number;
    standings: AfStandingRow[][];
  };
}

/** API-Football short status codes mapped to our internal status. */
export const STATUS_MAP: Record<string, string> = {
  TBD: "scheduled",
  NS: "scheduled",
  "1H": "live",
  HT: "live",
  "2H": "live",
  ET: "live",
  P: "live",
  LIVE: "live",
  FT: "finished",
  AET: "finished",
  PEN: "finished",
  PST: "postponed",
  CANC: "cancelled",
  ABD: "cancelled",
};
