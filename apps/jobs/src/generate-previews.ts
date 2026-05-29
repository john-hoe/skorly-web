import type { Env } from "./env";

/**
 * Day 6/10 skeleton: for fixtures kicking off in the next ~24h without a
 * published preview, run the full generate->QA->gate pipeline and persist.
 */
export async function generatePreviews(_env: Env): Promise<{ generated: number }> {
  // TODO Day 6: query upcoming fixtures, build MatchContext, call generateArticle,
  // insert into `articles` with status from the gate decision.
  return { generated: 0 };
}
