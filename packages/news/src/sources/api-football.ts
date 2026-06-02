import type { FetchOpts, RawSignal, SourceAdapter } from "../types";

export interface ApiFootballNewsOptions {
  apiKey: string;
  league?: number; // default World Cup (1)
  season?: number; // e.g. 2026
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface AfInjury {
  player?: { id?: number; name?: string; type?: string; reason?: string };
  team?: { id?: number; name?: string };
  fixture?: { id?: number; date?: string };
}

/**
 * Structured "hard fact" signals from API-Football (already licensed via our
 * paid plan). P1 covers injuries; transfers can be added the same way.
 * These are facts, not third-party prose — the cleanest signal source.
 */
export class ApiFootballNewsAdapter implements SourceAdapter {
  readonly source = "api_football" as const;
  private readonly apiKey: string;
  private readonly league: number;
  private readonly season: number;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ApiFootballNewsOptions) {
    this.apiKey = opts.apiKey;
    this.league = opts.league ?? 1;
    this.season = opts.season ?? new Date().getUTCFullYear();
    this.baseUrl = opts.baseUrl ?? "https://v3.football.api-sports.io";
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async fetch(_opts: FetchOpts = {}): Promise<RawSignal[]> {
    const url = new URL(`${this.baseUrl}/injuries`);
    url.searchParams.set("league", String(this.league));
    url.searchParams.set("season", String(this.season));

    const res = await this.fetchImpl(url.toString(), {
      headers: { "x-apisports-key": this.apiKey },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { response?: AfInjury[] };
    const rows = data.response ?? [];

    const out: RawSignal[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const pid = r.player?.id;
      const fid = r.fixture?.id;
      const pname = r.player?.name;
      const tname = r.team?.name;
      if (!pid || !pname) continue;
      const key = `urn:apifootball:injury:${pid}:${fid ?? "na"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const reason = r.player?.reason ?? r.player?.type ?? "injury";
      out.push({
        source: this.source,
        url: key,
        externalId: key,
        title: `${pname}${tname ? ` (${tname})` : ""} — ${reason}`,
        entities: { teams: tname ? [tname] : [], players: [pname] },
        publishedAt: r.fixture?.date ? new Date(r.fixture.date) : undefined,
      });
    }
    return out;
  }
}
