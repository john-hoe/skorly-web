import { json, readJson } from "@/lib/api/http";
import { analyticsIdentityFromCookieHeader } from "@/lib/analytics";
import { trackServerAfter } from "@/lib/analytics-server";
import { rateLimit } from "@/lib/ratelimit";
import { createRuntimeMiniLeague } from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

type CreateBody = {
  name?: string;
};

export async function POST(request: Request) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  const input = await readJson<CreateBody>(request);
  const name = input?.name?.trim() ?? "";
  if (name.length < 2) return json({ ok: false, error: "invalid" });

  const rl = await rateLimit(`league:create:${user.id}`, 5, 3600);
  if (!rl.success) return json({ ok: false, error: "rateLimited" });

  const league = await createRuntimeMiniLeague(user.id, name).catch(() => null);
  if (!league) return json({ ok: false, error: "generic" });
  const analytics = analyticsIdentityFromCookieHeader(request.headers.get("cookie"), user.id);
  trackServerAfter(
    "league_create",
    analytics.distinctId,
    { leagueId: league.id },
    {
      consentGranted: analytics.consentGranted,
      userId: user.id,
      userAgent: request.headers.get("user-agent"),
      url: request.url,
    },
  );
  return json({ ok: true, slug: league.slug });
}
