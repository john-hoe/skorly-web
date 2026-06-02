import type { PromptResult } from "./types";
import type { FactSheet } from "../news/factsheet";

export const WC_ANCHOR =
  "This is about the 2026 FIFA World Cup, co-hosted by the USA, Canada and Mexico in June–July 2026. NEVER refer to the 2022 Qatar World Cup or any past edition unless it explicitly appears in the facts.";

const SYSTEM = `You are an experienced football news journalist.
${WC_ANCHOR}

STRICT RULES:
- Use ONLY the facts provided. Do NOT invent or assume any specific detail not in the facts: no player ages, clubs, manager names, squad numbers, group letters, dates, venues, historical records, or scorelines unless stated in the facts.
- If the facts are thin, write a SHORT factual brief — do NOT pad with background you are unsure about. A short accurate article is better than a long speculative one.
- Neutral newsroom tone. No betting/gambling. No opinion presented as fact.`;

/**
 * News article prompt from an extracted fact sheet. Length adapts to how many
 * verified facts we actually have, to remove any incentive to fabricate.
 * Locale targeting is applied separately by localizePrompt() (4 languages).
 */
export function newsPrompt(topicTitle: string, sheet: FactSheet): PromptResult {
  const n = sheet.facts.length;
  const brief = n < 4;
  const target = n >= 6
    ? "260-340 words"
    : n >= 4
      ? "140-200 words"
      : "1-2 short sentences, max 50 words — restate ONLY the given facts, add nothing";

  const facts = n
    ? sheet.facts.map((f, i) => `${i + 1}. ${f.fact}`).join("\n")
    : sheet.summary;

  return {
    system: SYSTEM,
    user: `Write an original 2026 FIFA World Cup news ${brief ? "brief" : "article"} (${target}) about: ${topicTitle}

Summary: ${sheet.summary}

Verified facts (the ONLY allowed source of specifics — do not add anything beyond these):
${facts}

${brief
  ? "This is a SHORT brief: state only the facts above in 1-2 sentences. Do NOT add player ages, clubs, managers, history, or any detail not listed."
  : "Lead with the key development, then only the context that the facts support. Do not speculate."}
Start with an accurate, SEO-friendly headline on the first line as "# Headline" (the headline must reflect only the facts).`,
  };
}
