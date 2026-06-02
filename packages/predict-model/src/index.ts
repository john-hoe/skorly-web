/**
 * Skorly lightweight match forecast model.
 *
 * A bivariate-independent Poisson model over expected goals. Team attack /
 * defense strengths come from real tournament data (goals scored / conceded
 * per match, from standings), shrunk toward a neutral prior so that a 1–2 game
 * sample doesn't produce silly numbers. Before any match is played the model
 * falls back to a neutral prior + a mild home-listed advantage.
 *
 * Output is "win / draw / loss probabilities + most likely scoreline" — a
 * transparent statistical backing for the editorial AI prediction. It is NOT
 * betting odds: no decimal/fractional odds, no implied margin, no bookmaker.
 *
 * Pure, dependency-free, deterministic.
 */

export interface TeamForm {
  played: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface ScoreLine {
  home: number;
  away: number;
  prob: number; // 0..1
}

export interface MatchForecast {
  /** Expected goals for each side (model lambda). */
  expectedGoals: { home: number; away: number };
  /** Outcome probabilities as integer percentages, summing to 100. */
  probabilities: { homeWin: number; draw: number; awayWin: number };
  /** Single most likely exact scoreline. */
  mostLikelyScore: { home: number; away: number };
  /** Top exact scorelines by probability (percentages). */
  topScores: { home: number; away: number; prob: number }[];
  /**
   * 0..1 — how much real data backs this (vs. the neutral prior). Low before
   * the group stage has been played; rises as results come in.
   */
  confidence: number;
}

export interface ForecastOptions {
  /** Baseline goals per team per match. WC group stage ≈ 1.35. */
  leagueAvgGoals?: number;
  /** Multiplier applied to the home-listed team's lambda. */
  homeAdvantage?: number;
  /** Multiplier applied to the away-listed team's lambda. */
  awayFactor?: number;
  /** Max goals per side considered in the score matrix. */
  maxGoals?: number;
  /** Shrinkage games — strengths blend to neutral with few matches played. */
  shrinkGames?: number;
}

const DEFAULTS: Required<ForecastOptions> = {
  leagueAvgGoals: 1.35,
  homeAdvantage: 1.1,
  awayFactor: 0.92,
  maxGoals: 8,
  shrinkGames: 3,
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Poisson probability mass: P(X = k | lambda). */
function poissonPmf(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/**
 * Attack/defense strengths for one team, relative to the league average and
 * shrunk toward 1 based on sample size. Returns { attack, defense } ≈ 1 = avg.
 */
function strengths(
  form: TeamForm | null,
  avg: number,
  shrinkGames: number,
): { attack: number; defense: number } {
  if (!form || form.played <= 0) return { attack: 1, defense: 1 };
  const rawAttack = form.goalsFor / form.played / avg;
  const rawDefense = form.goalsAgainst / form.played / avg;
  const w = form.played / (form.played + shrinkGames); // 0..1
  return {
    attack: clamp(1 + w * (rawAttack - 1), 0.4, 2.5),
    defense: clamp(1 + w * (rawDefense - 1), 0.4, 2.5),
  };
}

/**
 * Forecast a match from each side's recent form. Either side may be null
 * (unknown → neutral prior).
 */
export function forecastMatch(
  homeForm: TeamForm | null,
  awayForm: TeamForm | null,
  options: ForecastOptions = {},
): MatchForecast {
  const o = { ...DEFAULTS, ...options };
  const h = strengths(homeForm, o.leagueAvgGoals, o.shrinkGames);
  const a = strengths(awayForm, o.leagueAvgGoals, o.shrinkGames);

  const lambdaHome = clamp(o.leagueAvgGoals * h.attack * a.defense * o.homeAdvantage, 0.1, 6);
  const lambdaAway = clamp(o.leagueAvgGoals * a.attack * h.defense * o.awayFactor, 0.1, 6);

  const homePmf = Array.from({ length: o.maxGoals + 1 }, (_, k) => poissonPmf(k, lambdaHome));
  const awayPmf = Array.from({ length: o.maxGoals + 1 }, (_, k) => poissonPmf(k, lambdaAway));

  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  const scores: ScoreLine[] = [];
  for (let i = 0; i <= o.maxGoals; i++) {
    for (let j = 0; j <= o.maxGoals; j++) {
      const p = (homePmf[i] ?? 0) * (awayPmf[j] ?? 0);
      scores.push({ home: i, away: j, prob: p });
      if (i > j) pHome += p;
      else if (i === j) pDraw += p;
      else pAway += p;
    }
  }

  // Normalize outcome probs (matrix is truncated at maxGoals) then to ints=100.
  const total = pHome + pDraw + pAway || 1;
  const probabilities = roundTo100(
    (pHome / total) * 100,
    (pDraw / total) * 100,
    (pAway / total) * 100,
  );

  scores.sort((x, y) => y.prob - x.prob);
  const topScores = scores.slice(0, 3).map((s) => ({
    home: s.home,
    away: s.away,
    prob: Math.round(s.prob * 1000) / 10, // one-decimal percentage
  }));
  const best = topScores[0] ?? { home: 1, away: 1, prob: 0 };

  const played = (homeForm?.played ?? 0) + (awayForm?.played ?? 0);
  const confidence = clamp(played / (played + 2 * o.shrinkGames), 0, 0.95);

  return {
    expectedGoals: {
      home: Math.round(lambdaHome * 100) / 100,
      away: Math.round(lambdaAway * 100) / 100,
    },
    probabilities,
    mostLikelyScore: { home: best.home, away: best.away },
    topScores,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/** Round three values to integers that sum to exactly 100 (largest remainder). */
function roundTo100(
  hw: number,
  dr: number,
  aw: number,
): { homeWin: number; draw: number; awayWin: number } {
  const raw = [hw, dr, aw];
  const floor = raw.map(Math.floor);
  let remainder = 100 - floor.reduce((s, n) => s + n, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((x, y) => y.frac - x.frac);
  const out = [...floor];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    const idx = order[k]!.i;
    out[idx] = (out[idx] ?? 0) + 1;
  }
  return { homeWin: out[0] ?? 0, draw: out[1] ?? 0, awayWin: out[2] ?? 0 };
}

/**
 * One-line, betting-free summary suitable for dropping into an AI prompt or a
 * UI caption. e.g. "Model: Brazil 48% / draw 27% / Serbia 25%, most likely 2-1."
 */
export function forecastSummary(
  f: MatchForecast,
  homeName: string,
  awayName: string,
): string {
  const { homeWin, draw, awayWin } = f.probabilities;
  const s = f.mostLikelyScore;
  return `${homeName} ${homeWin}% / draw ${draw}% / ${awayName} ${awayWin}%, most likely ${s.home}-${s.away}`;
}
