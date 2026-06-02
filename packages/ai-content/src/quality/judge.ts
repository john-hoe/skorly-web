import { complete } from "../llm-client";
import type { QaRound } from "@skorly/types";
import { localeEnglishName } from "../locale-meta";

/**
 * Pass 3: an independent model (via OpenRouter, different family from the
 * generator) scores the article on three axes 1-10. Returns parsed scores.
 */
export async function judge(
  article: string,
  opts: { locale?: string; round?: number; facts?: string } = {}
): Promise<QaRound> {
  const langName = localeEnglishName(opts.locale ?? "id");

  const res = await complete({
    role: "judge",
    temperature: 0,
    json: true,
    system: `You are a strict editorial QA reviewer for a ${langName} football news site. Score the article 1-10 on three axes and return JSON only.`,
    user: `Score this article. Return JSON:
{"fluency": <1-10 native ${langName} readability>,
 "factual": <1-10 consistency with provided facts>,
 "seo": <1-10 title/structure/keyword quality>,
 "notes": "<one short sentence>"}

${opts.facts ? `Known facts (must match):\n${opts.facts}\n\n` : ""}Article:
${article}`,
  });

  let parsed: Partial<QaRound> = {};
  try {
    parsed = JSON.parse(res.text);
  } catch {
    parsed = { fluency: 0, factual: 0, seo: 0, notes: "unparseable judge output" };
  }

  const fluency = clamp(parsed.fluency);
  const factual = clamp(parsed.factual);
  const seo = clamp(parsed.seo);
  const overall = Math.round(((fluency + factual + seo) / 3) * 10) / 10;

  return {
    round: opts.round ?? 1,
    model: res.model,
    fluency,
    factual,
    seo,
    overall,
    notes: parsed.notes,
  };
}

function clamp(n: unknown): number {
  const v = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(10, v));
}
