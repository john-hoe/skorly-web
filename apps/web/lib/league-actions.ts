"use server";

import {
  createMiniLeague,
  joinMiniLeague,
  getMiniLeagueStandings,
  type MiniLeague,
  type LeagueStanding,
} from "@skorly/db";
import { getSessionUser } from "./supabase/server";
import { rateLimit } from "./ratelimit";

export type CreateLeagueResult =
  | { ok: true; slug: string }
  | { ok: false; error: "unauth" | "invalid" | "rateLimited" | "generic" };

/** Create a private mini-league owned by the signed-in user. */
export async function createLeague(name: string): Promise<CreateLeagueResult> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { ok: false, error: "unauth" };
  if (!name || name.trim().length < 2) return { ok: false, error: "invalid" };
  const rl = await rateLimit(`league:create:${user.id}`, 5, 3600);
  if (!rl.success) return { ok: false, error: "rateLimited" };
  const league = await createMiniLeague(user.id, name).catch(() => null);
  if (!league) return { ok: false, error: "generic" };
  return { ok: true, slug: league.slug };
}

export type JoinLeagueActionResult =
  | { ok: true; alreadyMember: boolean }
  | { ok: false; error: "unauth" | "notFound" | "generic" };

/** Join a league via its invite slug. */
export async function joinLeague(slug: string): Promise<JoinLeagueActionResult> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { ok: false, error: "unauth" };
  const res = await joinMiniLeague(slug, user.id).catch(() => null);
  if (!res) return { ok: false, error: "generic" };
  if (!res.ok) return { ok: false, error: "notFound" };
  return { ok: true, alreadyMember: res.alreadyMember };
}

export type LeagueStandingsResult = {
  standings: LeagueStanding[];
  meId: string | null;
};

/** Standings for a league (client island refresh). */
export async function leagueStandings(campaignId: number): Promise<LeagueStandingsResult> {
  const user = await getSessionUser().catch(() => null);
  const standings = await getMiniLeagueStandings(campaignId).catch(() => []);
  return { standings, meId: user?.id ?? null };
}

export type { MiniLeague, LeagueStanding };
