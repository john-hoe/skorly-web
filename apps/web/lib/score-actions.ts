"use server";

import { getRuntimeFixtureEvents, getRuntimeLiveFixtures, type RuntimeFixtureEventView } from "./runtime-data";
import { toScoreRow, type ScoreRow } from "./score-types";

/** Live fixtures, polled by the scoreboard client island. */
export async function getLiveScores(): Promise<ScoreRow[]> {
  const live = await getRuntimeLiveFixtures().catch(() => []);
  return live.map(toScoreRow);
}

/** Minute-level events for a fixture (timeline client island). */
export async function getEvents(fixtureId: number): Promise<RuntimeFixtureEventView[]> {
  return getRuntimeFixtureEvents(fixtureId).catch(() => []);
}
