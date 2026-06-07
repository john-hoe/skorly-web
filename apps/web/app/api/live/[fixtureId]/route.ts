import { json, parsePositiveInt } from "@/lib/api/http";
import {
  LIVE_CACHE_HEADERS,
  getLiveFixtureSnapshot,
  liveKvConfiguredForRequest,
} from "@/lib/live-kv";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const fixtureId = parsePositiveInt((await params).fixtureId);
  if (!fixtureId) return json(null, { status: 400 });

  if (!(await liveKvConfiguredForRequest())) {
    return json({ ok: false, error: "live_kv_not_configured" }, { status: 503 });
  }

  return json(await getLiveFixtureSnapshot(fixtureId), {
    headers: LIVE_CACHE_HEADERS,
  });
}
