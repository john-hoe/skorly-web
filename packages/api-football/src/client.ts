import type {
  ApiResponse,
  AfTeam,
  AfFixture,
  AfPlayer,
} from "./types";

export interface ApiFootballOptions {
  apiKey: string;
  baseUrl?: string;
  /** Optional fetch impl (Workers vs Node). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** FIFA World Cup league id in API-Football. */
export const WORLD_CUP_LEAGUE_ID = 1;

/**
 * Thin typed client for API-Football v3.
 * Network calls are NOT exercised until a real key is configured; this is the
 * Day 3 skeleton, validated by unit tests with mocked fetch.
 */
export class ApiFootballClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ApiFootballOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? "https://v3.football.api-sports.io";
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number> = {}
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
    const res = await this.fetchImpl(url.toString(), {
      headers: { "x-apisports-key": this.apiKey },
    });
    if (!res.ok) {
      throw new Error(`API-Football ${path} failed: ${res.status}`);
    }
    return (await res.json()) as ApiResponse<T>;
  }

  /** All fixtures for a league + season (e.g. World Cup 2026). */
  fixturesByLeague(leagueId: number, season: number) {
    return this.get<AfFixture[]>("/fixtures", { league: leagueId, season });
  }

  /** Live fixtures (for Phase 1.6 live text scores). */
  liveFixtures(leagueId: number) {
    return this.get<AfFixture[]>("/fixtures", { live: "all", league: leagueId });
  }

  /** Teams participating in a league + season. */
  teamsByLeague(leagueId: number, season: number) {
    return this.get<AfTeam[]>("/teams", { league: leagueId, season });
  }

  /** Squad for a team. */
  playersByTeam(teamId: number, season: number) {
    return this.get<AfPlayer[]>("/players", { team: teamId, season });
  }

  /** Head-to-head between two teams. */
  headToHead(homeApiId: number, awayApiId: number) {
    return this.get<AfFixture[]>("/fixtures/headtohead", {
      h2h: `${homeApiId}-${awayApiId}`,
    });
  }
}
