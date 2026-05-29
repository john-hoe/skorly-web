import { complete } from "../llm-client";

/**
 * Pass 2: a "native Indonesian editor" rewrites the draft to remove
 * translation-ese and stiff phrasing. Routed to a SEA-strong model (Qwen).
 */
export async function critique(draft: string, locale = "id"): Promise<string> {
  const langName = locale === "vi" ? "Vietnamese" : locale === "en" ? "English" : "Indonesian";
  const res = await complete({
    role: "critique",
    temperature: 0.5,
    system: `You are a senior ${langName} football editor. Rewrite the article so it reads like a native ${langName} sports journalist wrote it: natural idioms, correct football terminology, smooth flow. Keep all facts, names and scores identical. Return only the rewritten article in markdown.`,
    user: draft,
  });
  return res.text.trim() || draft;
}
