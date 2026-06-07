import { json } from "@/lib/api/http";
import {
  LIVE_CACHE_HEADERS,
  getLiveAllSnapshot,
  liveKvConfiguredForRequest,
} from "@/lib/live-kv";
import type { LiveAllSnapshot } from "@skorly/types";

export const dynamic = "force-dynamic";

function emptySnapshot(): LiveAllSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    fixtures: [],
    apiCallsToday: 0,
    quotaState: "normal",
  };
}

export async function GET() {
  if (!(await liveKvConfiguredForRequest())) {
    return json({ ok: false, error: "live_kv_not_configured" }, { status: 503 });
  }
  return json((await getLiveAllSnapshot()) ?? emptySnapshot(), {
    headers: LIVE_CACHE_HEADERS,
  });
}
