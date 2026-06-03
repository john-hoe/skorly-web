import { json, parsePositiveInt } from "@/lib/api/http";
import { getRuntimeMatchForecast } from "@/lib/runtime-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const fixtureId = parsePositiveInt((await params).fixtureId);
  if (!fixtureId) return json(null, { status: 400 });

  const forecast = await getRuntimeMatchForecast(fixtureId).catch(() => null);
  return json(forecast);
}
