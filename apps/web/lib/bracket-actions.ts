"use server";

import {
  getRuntimeBracket,
  saveRuntimeBracket,
  type RuntimeBracketPicks,
} from "./runtime-data";
import { getSessionUser } from "./supabase/server";
import { rateLimit } from "./ratelimit";

export type GetBracketActionResult =
  | { ok: true; bracket: RuntimeBracketPicks | null }
  | { ok: false; error: "unauth" | "generic" };

export type SaveBracketActionResult =
  | { ok: true }
  | { ok: false; error: "unauth" | "invalid" | "rateLimited" | "generic" };

/** Fetch the signed-in user's saved bracket after the static page has loaded. */
export async function getBracketAction(): Promise<GetBracketActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauth" };

  try {
    return { ok: true, bracket: await getRuntimeBracket(user.id) };
  } catch {
    return { ok: false, error: "generic" };
  }
}

/** Persist the signed-in user's knockout bracket ("road to the final"). */
export async function saveBracketAction(
  picks: RuntimeBracketPicks,
): Promise<SaveBracketActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauth" };

  try {
    const rl = await rateLimit(`bracket:${user.id}`, 30, 60);
    if (!rl.success) return { ok: false, error: "rateLimited" };

    const res = await saveRuntimeBracket(user.id, picks);
    if (res.ok) return { ok: true };
    return { ok: false, error: res.reason === "invalid" ? "invalid" : "generic" };
  } catch {
    return { ok: false, error: "generic" };
  }
}

export type { RuntimeBracketPicks as BracketPicks };
