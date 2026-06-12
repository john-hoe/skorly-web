/**
 * AI predictor personas. Four clearly-labelled "Skorly AI" accounts predict
 * every upcoming fixture from the in-house Poisson/Elo forecast model, each
 * with a different strategy. They seed the leaderboard and community-picks
 * surfaces so early visitors don't land on an empty game, and they are scored
 * by the same cron as humans. Deterministic per (fixture, persona) so reruns
 * are idempotent. No LLM calls — pure stats, safe to run in the Worker.
 */
import {
  getMatchForecast,
  getPrediction,
  getProfileIdsByEmails,
  getUpcomingFixtures,
  upsertPrediction,
} from "@skorly/db";
import { AI_PREDICTOR_EMAILS } from "@skorly/types";

export interface AiPersona {
  email: string;
  displayName: string;
  strategy: "model" | "sampled" | "upset" | "cautious";
}

// Emails come from the shared constant so web-side AI detection can't drift.
export const AI_PERSONAS: AiPersona[] = [
  { email: AI_PREDICTOR_EMAILS[0], displayName: "Skorly AI · Elo", strategy: "model" },
  { email: AI_PREDICTOR_EMAILS[1], displayName: "Skorly AI · Poisson", strategy: "sampled" },
  { email: AI_PREDICTOR_EMAILS[2], displayName: "Skorly AI · Brave", strategy: "upset" },
  { email: AI_PREDICTOR_EMAILS[3], displayName: "Skorly AI · Cautious", strategy: "cautious" },
];

const HORIZON_MS = 48 * 60 * 60 * 1000;
const MIN_LEAD_MS = 5 * 60 * 1000;

/** Deterministic pseudo-random in [0,1) from a seed (mulberry32, one step). */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

interface ScorePick {
  home: number;
  away: number;
}

function winner(s: ScorePick): "home" | "draw" | "away" {
  if (s.home > s.away) return "home";
  if (s.home < s.away) return "away";
  return "draw";
}

function pickScore(
  strategy: AiPersona["strategy"],
  forecast: {
    mostLikelyScore: ScorePick;
    topScores: Array<ScorePick & { prob: number }>;
    probabilities: { homeWin: number; draw: number; awayWin: number };
  },
  seed: number,
): ScorePick {
  const { mostLikelyScore, topScores, probabilities } = forecast;

  switch (strategy) {
    case "model":
      return mostLikelyScore;

    case "sampled": {
      const total = topScores.reduce((s, x) => s + x.prob, 0) || 1;
      let r = seededRandom(seed) * total;
      for (const s of topScores) {
        r -= s.prob;
        if (r <= 0) return s;
      }
      return mostLikelyScore;
    }

    case "upset": {
      const favourite =
        probabilities.homeWin >= probabilities.awayWin
          ? probabilities.homeWin >= probabilities.draw
            ? "home"
            : "draw"
          : probabilities.awayWin >= probabilities.draw
            ? "away"
            : "draw";
      const upset = topScores.find((s) => winner(s) !== favourite && winner(s) !== "draw");
      if (upset) return upset;
      // Manufacture a plausible upset from the most likely score.
      if (favourite === "home") return { home: mostLikelyScore.away, away: mostLikelyScore.home + 1 };
      if (favourite === "away") return { home: mostLikelyScore.away + 1, away: mostLikelyScore.home };
      return seededRandom(seed) < 0.5 ? { home: 2, away: 1 } : { home: 1, away: 2 };
    }

    case "cautious": {
      const sorted = [...topScores].sort(
        (a, b) => a.home + a.away - (b.home + b.away) || b.prob - a.prob,
      );
      return sorted[0] ?? mostLikelyScore;
    }
  }
}

async function aiProfileIds(): Promise<Map<string, string>> {
  const rows = await getProfileIdsByEmails(AI_PERSONAS.map((p) => p.email));
  const map = new Map<string, string>();
  for (const r of rows) if (r.email) map.set(r.email, r.id);
  return map;
}

export async function makeAiPredictions(): Promise<{
  fixtures: number;
  written: number;
  skippedNoProfiles: boolean;
}> {
  const ids = await aiProfileIds();
  if (ids.size === 0) {
    console.warn("[ai-predictions] no AI profiles seeded yet — run seed-ai-predictors first");
    return { fixtures: 0, written: 0, skippedNoProfiles: true };
  }

  const now = Date.now();
  const fixtures = (await getUpcomingFixtures(24)).filter((f) => {
    if (f.status !== "scheduled" || !f.kickoffAt) return false;
    const t = new Date(f.kickoffAt).getTime();
    return t > now + MIN_LEAD_MS && t < now + HORIZON_MS;
  });

  let written = 0;
  for (const f of fixtures) {
    let forecast: Awaited<ReturnType<typeof getMatchForecast>> = null;
    for (let i = 0; i < AI_PERSONAS.length; i++) {
      const persona = AI_PERSONAS[i]!;
      const userId = ids.get(persona.email);
      if (!userId) continue;

      const existing = await getPrediction(userId, f.id).catch(() => null);
      if (existing) continue;

      forecast = forecast ?? (await getMatchForecast(f.id).catch(() => null));
      if (!forecast) break;

      const score = pickScore(persona.strategy, forecast.forecast, f.id * 131 + i);
      await upsertPrediction(userId, f.id, score.home, score.away);
      written++;
    }
  }

  if (written) console.log(`[ai-predictions] wrote ${written} predictions across ${fixtures.length} fixtures`);
  return { fixtures: fixtures.length, written, skippedNoProfiles: false };
}
