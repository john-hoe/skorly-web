"use server";

import { getLiveFixtures, getFixtureEvents, type FixtureEventView } from "@skorly/db";
import { toScoreRow, type ScoreRow } from "./score-types";

/** Live fixtures, polled by the scoreboard client island. */
export async function getLiveScores(): Promise<ScoreRow[]> {
  const live = await getLiveFixtures().catch(() => []);
  return live.map(toScoreRow);
}

/** Minute-level events for a fixture (timeline client island). */
export async function getEvents(fixtureId: number): Promise<FixtureEventView[]> {
  return getFixtureEvents(fixtureId).catch(() => []);
}
