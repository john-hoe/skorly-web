import { json } from "@/lib/api/http";
import {
  LIVE_CACHE_HEADERS,
  getLiveAllSnapshot,
  liveKvConfiguredForRequest,
} from "@/lib/live-kv";
import type { ScoreRow } from "@/lib/score-types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await liveKvConfiguredForRequest())) {
    return json({ ok: false, error: "live_kv_not_configured" }, { status: 503 });
  }
  const snapshot = await getLiveAllSnapshot();
  const rows: ScoreRow[] = (snapshot?.fixtures ?? []).map((fixture) => ({
    id: fixture.id,
    slug: fixture.slug,
    status: fixture.status,
    elapsed: fixture.elapsed,
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
    kickoff: fixture.kickoffAt,
    groupName: fixture.groupName,
    round: fixture.round,
    home: { name: fixture.home.name, code: fixture.home.code, logo: fixture.home.logo },
    away: { name: fixture.away.name, code: fixture.away.code, logo: fixture.away.logo },
  }));
  return json(rows, { headers: LIVE_CACHE_HEADERS });
}
