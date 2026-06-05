import { describe, expect, it } from "vitest";
import { forecastMatch, forecastSummary } from "./index";

describe("forecastMatch", () => {
  it("returns a deterministic neutral-prior forecast when both forms are missing", () => {
    const forecast = forecastMatch(null, null);

    expect(forecast.expectedGoals).toEqual({ home: 1.49, away: 1.24 });
    expect(forecast.probabilities.homeWin + forecast.probabilities.draw + forecast.probabilities.awayWin).toBe(100);
    expect(forecast.mostLikelyScore).toEqual({ home: 1, away: 1 });
    expect(forecast.topScores).toHaveLength(3);
    expect(forecast.confidence).toBe(0);
  });

  it("moves probabilities toward a team with stronger played form", () => {
    const forecast = forecastMatch(
      { played: 3, goalsFor: 9, goalsAgainst: 1 },
      { played: 3, goalsFor: 1, goalsAgainst: 7 }
    );

    expect(forecast.expectedGoals.home).toBeGreaterThan(forecast.expectedGoals.away);
    expect(forecast.probabilities.homeWin).toBeGreaterThan(forecast.probabilities.awayWin);
    expect(forecast.confidence).toBeGreaterThan(0);
  });

  it("produces a betting-free summary with the scoreline and probabilities", () => {
    const forecast = forecastMatch(null, null);

    expect(forecastSummary(forecast, "Mexico", "South Africa")).toBe(
      "Mexico 43% / draw 25% / South Africa 32%, most likely 1-1"
    );
  });
});
