import { json, parsePositiveInt } from "@/lib/api/http";
import { getRuntimePublicPicks } from "@/lib/runtime-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const fixtureId = parsePositiveInt((await params).fixtureId);
  if (!fixtureId) return json([], { status: 400 });

  const picks = await getRuntimePublicPicks(fixtureId).catch(() => []);
  return json(picks);
}
