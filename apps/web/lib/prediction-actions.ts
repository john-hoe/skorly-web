"use server";

import {
  getPrediction,
  upsertPrediction,
  getMatchForecast,
  getPublicPicks,
  type PredictionView,
  type MatchForecastView,
  type PublicPick,
} from "@skorly/db";
import { getSessionUser } from "./supabase/server";
import { rateLimit } from "./ratelimit";

/** Statistical forecast for a fixture (client island → page stays static). */
export async function getForecast(fixtureId: number): Promise<MatchForecastView | null> {
  return getMatchForecast(fixtureId).catch(() => null);
}

/** Recent community picks for a fixture (structured "show your prediction"). */
export async function getPicks(fixtureId: number): Promise<PublicPick[]> {
  return getPublicPicks(fixtureId).catch(() => []);
}

export type MyPredictionResult =
  | { auth: false }
  | { auth: true; prediction: PredictionView | null };

/** Read the signed-in user's prediction for a fixture (for the widget hydrate). */
export async function getMyPrediction(fixtureId: number): Promise<MyPredictionResult> {
  const user = await getSessionUser();
  if (!user) return { auth: false };
  const prediction = await getPrediction(user.id, fixtureId).catch(() => null);
  return { auth: true, prediction };
}

export type SubmitPredictionResult =
  | { ok: true; home: number; away: number }
  | { ok: false; error: "unauth" | "locked" | "invalid" | "rateLimited" | "generic" };

/** Submit/update a score prediction for the signed-in user. */
export async function submitPrediction(
  fixtureId: number,
  home: number,
  away: number,
): Promise<SubmitPredictionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauth" };

  const rl = await rateLimit(`predict:${user.id}`, 60, 60);
  if (!rl.success) return { ok: false, error: "rateLimited" };

  const res = await upsertPrediction(user.id, fixtureId, home, away);
  if (!res.ok) {
    return {
      ok: false,
      error:
        res.reason === "locked"
          ? "locked"
          : res.reason === "invalid"
            ? "invalid"
            : "generic",
    };
  }
  return { ok: true, home, away };
}
