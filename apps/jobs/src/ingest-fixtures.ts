import { ApiFootballClient, WORLD_CUP_LEAGUE_ID, STATUS_MAP } from "@skorly/api-football";
import { getDb, teams, fixtures, leagues } from "@skorly/db";
import type { FixtureStatus } from "@skorly/types";

export interface IngestOptions {
  apiKey: string;
  baseUrl?: string;
  /** Season year. WC2026 = 2026 (requires API-Football Pro). */
  season?: number;
  leagueId?: number;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapStatus(short: string): FixtureStatus {
  return (STATUS_MAP[short] as FixtureStatus) ?? "scheduled";
}

/** Pull all World Cup teams + fixtures and upsert into the database. */
export async function ingestFixtures(opts: IngestOptions): Promise<{
  teams: number;
  fixtures: number;
  season: number;
}> {
  const season = opts.season ?? 2026;
  const leagueId = opts.leagueId ?? WORLD_CUP_LEAGUE_ID;
  const client = new ApiFootballClient({
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
  });
  const db = getDb();

  // 1. League row
  await db
    .insert(leagues)
    .values({ apiId: leagueId, name: "FIFA World Cup", type: "Cup", season })
    .onConflictDoUpdate({ target: leagues.apiId, set: { season } });

  // 2. Teams
  const teamsRes = await client.teamsByLeague(leagueId, season);
  for (const t of teamsRes.response) {
    await db
      .insert(teams)
      .values({
        apiId: t.team.id,
        name: t.team.name,
        slug: slugify(t.team.name),
        code: t.team.code,
        country: t.team.country,
        logo: t.team.logo,
        isNational: t.team.national,
      })
      .onConflictDoUpdate({
        target: teams.apiId,
        set: { name: t.team.name, logo: t.team.logo, code: t.team.code },
      });
  }

  // Build apiId -> internal id map for fixture FKs
  const teamRows = await db.select({ id: teams.id, apiId: teams.apiId }).from(teams);
  const teamIdByApi = new Map(teamRows.map((r) => [r.apiId, r.id]));

  const leagueRow = await db
    .select({ id: leagues.id })
    .from(leagues)
    .limit(1);
  const leagueInternalId = leagueRow[0]?.id ?? null;

  // 3. Fixtures
  const fixturesRes = await client.fixturesByLeague(leagueId, season);
  for (const f of fixturesRes.response) {
    const homeId = teamIdByApi.get(f.teams.home.id) ?? null;
    const awayId = teamIdByApi.get(f.teams.away.id) ?? null;
    const dateStr = f.fixture.date.slice(0, 10).replace(/-/g, "");
    const slug = `${slugify(f.teams.home.name)}-vs-${slugify(f.teams.away.name)}-${dateStr}`;

    await db
      .insert(fixtures)
      .values({
        apiId: f.fixture.id,
        leagueId: leagueInternalId,
        slug,
        round: f.league.round,
        stage: f.league.round?.toLowerCase().includes("group") ? "group" : "knockout",
        homeTeamId: homeId,
        awayTeamId: awayId,
        kickoffAt: new Date(f.fixture.date),
        venue: f.fixture.venue?.name ?? null,
        city: f.fixture.venue?.city ?? null,
        status: mapStatus(f.fixture.status.short),
        homeGoals: f.goals.home,
        awayGoals: f.goals.away,
        elapsed: f.fixture.status.elapsed,
      })
      .onConflictDoUpdate({
        target: fixtures.apiId,
        set: {
          status: mapStatus(f.fixture.status.short),
          homeGoals: f.goals.home,
          awayGoals: f.goals.away,
          elapsed: f.fixture.status.elapsed,
          updatedAt: new Date(),
        },
      });
  }

  return {
    teams: teamsRes.response.length,
    fixtures: fixturesRes.response.length,
    season,
  };
}
