import { json, parsePositiveInt } from "@/lib/api/http";
import { getRuntimeFixtureEvents } from "@/lib/runtime-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const fixtureId = parsePositiveInt((await params).fixtureId);
  if (!fixtureId) return json([], { status: 400 });

  const events = await getRuntimeFixtureEvents(fixtureId).catch(() => []);
  return json(events);
}
