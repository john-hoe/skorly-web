"use server";

import { headers } from "next/headers";
import {
  deleteRuntimePushSubscription,
  saveRuntimePushSubscription,
  type RuntimePushKeys,
  type RuntimePushTopics,
} from "./runtime-data";
import { getSessionUser } from "./supabase/server";
import { rateLimit, clientIp } from "./ratelimit";

export interface BrowserSubscription {
  endpoint: string;
  keys: RuntimePushKeys;
}

export type SubscribePushResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rateLimited" | "generic" };

/** Persist a browser Push subscription (anonymous allowed; userId backfilled). */
export async function subscribePush(
  sub: BrowserSubscription,
  opts?: { locale?: string; topics?: RuntimePushTopics },
): Promise<SubscribePushResult> {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return { ok: false, error: "invalid" };
  }

  const h = await headers();
  const rl = await rateLimit(`push:sub:${clientIp(h)}`, 20, 60);
  if (!rl.success) return { ok: false, error: "rateLimited" };

  const user = await getSessionUser().catch(() => null);

  try {
    await saveRuntimePushSubscription({
      endpoint: sub.endpoint,
      keys: sub.keys,
      userId: user?.id ?? null,
      locale: opts?.locale,
      topics: opts?.topics,
      userAgent: h.get("user-agent"),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

/** Remove a subscription by endpoint (user toggled off / browser revoked). */
export async function unsubscribePush(endpoint: string): Promise<{ ok: boolean }> {
  if (!endpoint) return { ok: false };
  try {
    await deleteRuntimePushSubscription(endpoint);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
