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
    // Fast non-thinking model — literal translation needs no deep reasoning.
    model: process.env.QWEN_FAST_MODEL ?? "qwen-flash",
    temperature: 0,
    system: "Translate the following article to English literally. Return only the translation.",
    user: article,
  });
  const english = res.text;
  const lower = english.toLowerCase();
  const missing = expectedEntities.filter((e) => e && !entitySurvived(e, lower));
  return { ok: missing.length === 0, missing, english };
}

/** Strip accents so "Türkiye" ↔ "Turkiye" etc. compare equal. */
function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Acceptable alias tokens for team names whose English back-translation differs
 * entirely from the DB label (not just word order).
 */
const ENTITY_ALIASES: Record<string, string[]> = {
  "turkiye": ["turkey"],
  "ivory coast": ["ivoire", "cote"],
  "congo dr": ["congo"],
  "ir iran": ["iran"],
  "korea republic": ["korea"],
  "south korea": ["korea"],
  "usa": ["united states", "america"],
  "czechia": ["czech"],
};

/**
 * An entity "survived" the round-trip if a distinctive token (or known alias)
 * appears in the back-translation. Tolerates word-order/naming/diacritic
 * variants across languages while still catching a fully dropped entity.
 */
function entitySurvived(entity: string, haystackLower: string): boolean {
  const hay = deaccent(haystackLower);
  const e = deaccent(entity.toLowerCase().trim());
  if (hay.includes(e)) return true;

  const aliases = ENTITY_ALIASES[e] ?? [];
  if (aliases.some((a) => hay.includes(deaccent(a)))) return true;

  const tokens = e.split(/\s+/).filter((t) => t.length >= 4);
  if (tokens.length === 0) return hay.includes(e);
  return tokens.some((t) => hay.includes(t));
}
