import { json, readJson } from "@/lib/api/http";
import { deleteRuntimePushSubscription } from "@/lib/runtime-data";
import { analyticsIdentityFromCookieHeader, trackServer } from "@/lib/analytics";

type UnsubscribeBody = {
  endpoint?: string;
};

export async function POST(request: Request) {
  const input = await readJson<UnsubscribeBody>(request);
  if (!input?.endpoint) return json({ ok: false }, { status: 400 });

  try {
    await deleteRuntimePushSubscription(input.endpoint);
    const analytics = analyticsIdentityFromCookieHeader(request.headers.get("cookie"));
    await trackServer("push_opt_out", analytics.distinctId, {}, {
      consentGranted: analytics.consentGranted,
      userAgent: request.headers.get("user-agent"),
      url: request.url,
    });
    return json({ ok: true });
  } catch {
    return json({ ok: false });
  }
}
