import type {
  ApiResponse,
  AfTeam,
  AfFixtureEvent,
  AfFixture,
  AfFixtureStatistics,
  AfPlayer,
  AfStandingsLeague,
} from "./types";

export interface ApiFootballOptions {
  apiKey: string;
  baseUrl?: string;
  /** Optional fetch impl (Workers vs Node). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Called before each actual HTTP request, including retries. */
  onRequest?: () => void;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

/** FIFA World Cup league id in API-Football. */
export const WORLD_CUP_LEAGUE_ID = 1;

export class ApiFootballError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiFootballError";
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Thin typed client for API-Football v3.
 * Network calls are NOT exercised until a real key is configured; this is the
 * Day 3 skeleton, validated by unit tests with mocked fetch.
 */
export class ApiFootballClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly onRequest?: () => void;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

  constructor(opts: ApiFootballOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? "https://v3.football.api-sports.io";
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.onRequest = opts.onRequest;
    this.maxRetries = opts.maxRetries ?? 2;
    this.retryBaseDelayMs = opts.retryBaseDelayMs ?? 250;
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number> = {}
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      this.onRequest?.();
      const res = await this.fetchImpl(url.toString(), {
        headers: { "x-apisports-key": this.apiKey },
      });
      if (res.ok) {
        return (await res.json()) as ApiResponse<T>;
      }
      if (res.status === 429 && attempt < this.maxRetries) {
        await sleep(this.retryBaseDelayMs * 2 ** attempt);
        continue;
      }
      throw new ApiFootballError(`API-Football ${path} failed: ${res.status}`, res.status);
    }
    throw new ApiFootballError(`API-Football ${path} failed`, 0);
  }

  /** All fixtures for a league + season (e.g. World Cup 2026). */
  fixturesByLeague(leagueId: number, season: number) {
    return this.get<AfFixture[]>("/fixtures", { league: leagueId, season });
  }

  /** Live fixtures (for Phase 1.6 live text scores). */
  liveFixtures(leagueId: number) {
    return this.get<AfFixture[]>("/fixtures", { live: "all", league: leagueId });
  }

  /** One fixture by API-Football fixture id. */
  fixtureById(fixtureId: number) {
    return this.get<AfFixture[]>("/fixtures", { id: fixtureId });
  }

  /** Minute-level events for one fixture. */
  fixtureEvents(fixtureId: number) {
    return this.get<AfFixtureEvent[]>("/fixtures/events", { fixture: fixtureId });
  }

  /** Live technical statistics (possession/shots/corners/fouls) for one fixture. */
  fixtureStatistics(fixtureId: number) {
    return this.get<AfFixtureStatistics[]>("/fixtures/statistics", { fixture: fixtureId });
  }

  /** Teams participating in a league + season. */
  teamsByLeague(leagueId: number, season: number) {
    return this.get<AfTeam[]>("/teams", { league: leagueId, season });
  }

  /** Squad for a team. */
  playersByTeam(teamId: number, season: number) {
    return this.get<AfPlayer[]>("/players", { team: teamId, season });
  }

  /** Standings (groups) for a league + season. */
  standings(leagueId: number, season: number) {
    return this.get<AfStandingsLeague[]>("/standings", {
      league: leagueId,
      season,
    });
  }

  /** Head-to-head between two teams. */
  headToHead(homeApiId: number, awayApiId: number) {
    return this.get<AfFixture[]>("/fixtures/headtohead", {
      h2h: `${homeApiId}-${awayApiId}`,
    });
  }
}
