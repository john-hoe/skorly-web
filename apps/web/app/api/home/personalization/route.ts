import { json } from "@/lib/api/http";
import { getRuntimeUpcomingFixtures, getRuntimeUserPredictionStats } from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ auth: false });

  const [stats, upcoming] = await Promise.all([
    getRuntimeUserPredictionStats(user.id).catch(() => null),
    getRuntimeUpcomingFixtures(1).catch(() => []),
  ]);
  const f = upcoming[0];
  return json({
    auth: true,
    points: stats?.points ?? 0,
    rank: stats?.rank ?? null,
    scored: stats?.scored ?? 0,
    nextMatch: f ? { slug: f.slug, home: f.home.name, away: f.away.name } : null,
  });
}
