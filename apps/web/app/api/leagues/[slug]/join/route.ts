import { json } from "@/lib/api/http";
import { analyticsIdentityFromCookieHeader } from "@/lib/analytics";
import { trackServerAfter } from "@/lib/analytics-server";
import { joinRuntimeMiniLeague } from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  const slug = (await params).slug;
  const res = await joinRuntimeMiniLeague(slug, user.id).catch(() => null);
  if (!res) return json({ ok: false, error: "generic" });
  if (!res.ok) return json({ ok: false, error: "notFound" });
  if (!res.alreadyMember) {
    const analytics = analyticsIdentityFromCookieHeader(request.headers.get("cookie"), user.id);
    trackServerAfter(
      "league_join",
      analytics.distinctId,
      { leagueId: res.league.id },
      {
        consentGranted: analytics.consentGranted,
        userId: user.id,
        userAgent: request.headers.get("user-agent"),
        url: request.url,
      },
    );
  }
  return json({ ok: true, alreadyMember: res.alreadyMember });
}
