"use server";

import { getRuntimeUpcomingFixtures, getRuntimeUserPredictionStats } from "./runtime-data";
import { getSessionUser } from "./supabase/server";

export type HomePersonalization =
  | { auth: false }
  | {
      auth: true;
      points: number;
      rank: number | null;
      scored: number;
      nextMatch: { slug: string; home: string; away: string } | null;
    };

/** Personalized home strip (client island so the page stays static). */
export async function getHomePersonalization(): Promise<HomePersonalization> {
  const user = await getSessionUser();
  if (!user) return { auth: false };

  const [stats, upcoming] = await Promise.all([
    getRuntimeUserPredictionStats(user.id).catch(() => null),
    getRuntimeUpcomingFixtures(1).catch(() => []),
  ]);

  const f = upcoming[0];
  return {
    auth: true,
    points: stats?.points ?? 0,
    rank: stats?.rank ?? null,
    scored: stats?.scored ?? 0,
    nextMatch: f ? { slug: f.slug, home: f.home.name, away: f.away.name } : null,
  };
}
