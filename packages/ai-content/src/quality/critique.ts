import { complete } from "../llm-client";
import { localeEnglishName } from "../locale-meta";

/**
 * Pass 2: a native editor rewrites the draft to remove translation-ese.
 * Routed to a SEA-strong model (Qwen).
 */
export async function critique(draft: string, locale = "id"): Promise<string> {
  const langName = localeEnglishName(locale);
  const res = await complete({
    role: "critique",
    // Fast non-thinking model — rewriting for fluency needs no deep reasoning.
    model: process.env.QWEN_FAST_MODEL ?? "qwen-flash",
    temperature: 0.5,
    system: `You are a senior ${langName} football editor. Rewrite the article so it reads like a native ${langName} sports journalist wrote it: natural idioms, correct football terminology, smooth flow. Keep all facts, names and scores identical. Return only the rewritten article in markdown.`,
    user: draft,
  });
  return res.text.trim() || draft;
}
