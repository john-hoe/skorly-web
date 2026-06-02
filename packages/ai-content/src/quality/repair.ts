import { complete } from "../llm-client";
import { localeEnglishName } from "../locale-meta";

/**
 * Targeted grounding repair. When the editorial review flags specific
 * fabricated details (a guessed manager name, a player's age/position/number,
 * an invented scoreline), we don't blindly regenerate — we ask a DIFFERENT
 * model to surgically remove ONLY those claims and keep everything else.
 *
 * This raises the publish rate without weakening the zero-fabrication bar: the
 * repaired article is re-judged and re-reviewed before it can be published.
 */
export async function repairArticle(
  article: string,
  unsupportedClaims: string[],
  locale = "id"
): Promise<string> {
  if (!unsupportedClaims.length) return article;
  const langName = localeEnglishName(locale);
  const claims = unsupportedClaims.map((c, i) => `${i + 1}. ${c}`).join("\n");

  const res = await complete({
    role: "critique", // qwen — fast, faithful rewrite (not the generator)
    temperature: 0,
    system: `You are a copy editor for a football news site. The article is in ${langName}. A fact-checker flagged specific UNVERIFIED claims the writer guessed (they are NOT in the verified facts). Remove or generalise ONLY those claims; keep the rest of the article — its structure, headline style, tone and all OTHER content — intact. Do not add any new specifics. Return ONLY the corrected article in ${langName} (markdown, headline on the first line as "# Headline").`,
    user: `UNVERIFIED claims to remove or make non-specific (delete the exact detail, or rephrase so the unverified specific is gone — never invent a replacement):
${claims}

ARTICLE:
${article}

Return the corrected article only — no commentary.`,
  });

  return res.text.trim() || article;
}
