import { json } from "@/lib/api/http";
import { getRuntimeLiveFixtures } from "@/lib/runtime-data";
import { toScoreRow } from "@/lib/score-types";

export async function GET() {
  const live = await getRuntimeLiveFixtures().catch(() => []);
  return json(live.map(toScoreRow));
}
