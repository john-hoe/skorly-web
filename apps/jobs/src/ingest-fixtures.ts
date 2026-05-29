import { ApiFootballClient, WORLD_CUP_LEAGUE_ID, STATUS_MAP } from "@skorly/api-football";
import type { Env } from "./env";

const SEASON = 2026;

/**
 * Day 5 skeleton: pull all World Cup teams + fixtures and upsert into Neon.
 * Implementation of the DB upserts lands on Day 5 once DATABASE_URL is set.
 */
export async function ingestFixtures(env: Env): Promise<{ teams: number; fixtures: number }> {
  const client = new ApiFootballClient({
    apiKey: env.API_FOOTBALL_KEY,
    baseUrl: env.API_FOOTBALL_BASE_URL,
  });

  const [teamsRes, fixturesRes] = await Promise.all([
    client.teamsByLeague(WORLD_CUP_LEAGUE_ID, SEASON),
    client.fixturesByLeague(WORLD_CUP_LEAGUE_ID, SEASON),
  ]);

  // TODO Day 5: map STATUS_MAP + slugify + upsert teams/fixtures via @skorly/db.
  void STATUS_MAP;

  return {
    teams: teamsRes.response.length,
    fixtures: fixturesRes.response.length,
  };
}
