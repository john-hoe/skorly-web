"use server";

import { getRuntimeArticlesForFixture } from "./runtime-data";
import { getSessionUser } from "./supabase/server";
import { renderMarkdown } from "./markdown";

export type PremiumArticleResult =
  | { authorized: true; html: string }
  | { authorized: false };

/**
 * Full premium prediction plan for a fixture, unlocked for signed-in users.
 * Anonymous visitors get the free preview rendered server-side on the page;
 * the deep plan stays behind login (and is also delivered to confirmed email
 * subscribers via the pre-match broadcast).
 */
export async function getPremiumArticle(
  fixtureId: number,
  locale = "id",
): Promise<PremiumArticleResult> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { authorized: false };

  const articles = await getRuntimeArticlesForFixture(fixtureId, locale).catch(() => []);
  const prediction = articles.find((a) => a.type === "prediction");
  if (!prediction) return { authorized: false };

  return {
    authorized: true,
    html: renderMarkdown(prediction.body, { headingOffset: 2 }),
  };
}
