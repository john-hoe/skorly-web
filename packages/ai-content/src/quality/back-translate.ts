import { complete } from "../llm-client";

export interface BackTranslateCheck {
  ok: boolean;
  missing: string[];
  english: string;
}

/**
 * Pass 4: translate the localized article back to English and verify that key
 * entities (team names, score, player names) survived. Catches garbled output
 * and factual drift that fluency scoring alone misses.
 */
export async function backTranslateCheck(
  article: string,
  expectedEntities: string[]
): Promise<BackTranslateCheck> {
  const res = await complete({
    role: "fallback",
    temperature: 0,
    system: "Translate the following article to English literally. Return only the translation.",
    user: article,
  });
  const english = res.text;
  const lower = english.toLowerCase();
  const missing = expectedEntities.filter(
    (e) => e && !lower.includes(e.toLowerCase())
  );
  return { ok: missing.length === 0, missing, english };
}
