import { headers } from "next/headers";
import { json, readJson } from "@/lib/api/http";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import {
  saveRuntimePushSubscription,
  type RuntimePushTopics,
} from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";
import { analyticsIdentityFromCookieHeader, trackServer } from "@/lib/analytics";

type SubscribeBody = {
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
  options?: {
    locale?: string;
    topics?: RuntimePushTopics;
  };
};

export async function POST(request: Request) {
  const input = await readJson<SubscribeBody>(request);
  const sub = input?.subscription;
  const options = input?.options;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys.auth) {
    return json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const h = await headers();
  const rl = await rateLimit(`push:sub:${clientIp(h)}`, 20, 60);
  if (!rl.success) return json({ ok: false, error: "rateLimited" });

  const user = await getSessionUser().catch(() => null);
  try {
    await saveRuntimePushSubscription({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      userId: user?.id ?? null,
      locale: options?.locale,
      topics: options?.topics,
      userAgent: h.get("user-agent"),
    });
    const analytics = analyticsIdentityFromCookieHeader(
      request.headers.get("cookie"),
      user?.id ?? null,
    );
    await trackServer("push_opt_in", analytics.distinctId, {}, {
      consentGranted: analytics.consentGranted,
      userId: user?.id ?? null,
      userAgent: h.get("user-agent"),
      url: request.url,
    });
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "generic" });
  }
}
