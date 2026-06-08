import { json, readJson } from "@/lib/api/http";
import { analyticsIdentityFromCookieHeader } from "@/lib/analytics";
import { trackServerAfter } from "@/lib/analytics-server";
import { rateLimit } from "@/lib/ratelimit";
import {
  getRuntimeBracket,
  saveRuntimeBracket,
  type RuntimeBracketPicks,
} from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  try {
    return json({ ok: true, bracket: await getRuntimeBracket(user.id) });
  } catch {
    return json({ ok: false, error: "generic" });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  const picks = await readJson<RuntimeBracketPicks>(request);
  if (!picks) return json({ ok: false, error: "invalid" }, { status: 400 });

  try {
    const rl = await rateLimit(`bracket:${user.id}`, 30, 60);
    if (!rl.success) return json({ ok: false, error: "rateLimited" });

    const res = await saveRuntimeBracket(user.id, picks);
    if (res.ok) {
      const analytics = analyticsIdentityFromCookieHeader(request.headers.get("cookie"), user.id);
      trackServerAfter(
        "bracket_save",
        analytics.distinctId,
        {
          numPicks:
            picks.semifinalists.length +
            picks.finalists.length +
            (picks.champion == null ? 0 : 1),
          championTeamId: picks.champion,
        },
        {
          consentGranted: analytics.consentGranted,
          userId: user.id,
          userAgent: request.headers.get("user-agent"),
          url: request.url,
        },
      );
      return json({ ok: true });
    }
    return json({ ok: false, error: res.reason === "invalid" ? "invalid" : "generic" });
  } catch {
    return json({ ok: false, error: "generic" });
  }
}
