"use server";

import { saveBracket, type BracketPicks } from "@skorly/db";
import { getSessionUser } from "./supabase/server";
import { rateLimit } from "./ratelimit";

export type SaveBracketActionResult =
  | { ok: true }
  | { ok: false; error: "unauth" | "invalid" | "rateLimited" | "generic" };

/** Persist the signed-in user's knockout bracket ("road to the final"). */
export async function saveBracketAction(
  picks: BracketPicks,
): Promise<SaveBracketActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauth" };

  const rl = await rateLimit(`bracket:${user.id}`, 30, 60);
  if (!rl.success) return { ok: false, error: "rateLimited" };

  const res = await saveBracket(user.id, picks);
  if (res.ok) return { ok: true };
  return { ok: false, error: res.reason === "invalid" ? "invalid" : "generic" };
}
