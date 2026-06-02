import { complete } from "./llm-client";
import { localeEnglishName } from "./locale-meta";

/**
 * Faithfully translate an approved base article into a target language.
 * A translator can only render what's there — it cannot invent new facts —
 * so the translation inherits the (already-vetted) accuracy of the base.
 * Uses a fast non-thinking model; instructions force literal fidelity.
 */
export async function translateArticle(
  baseMarkdown: string,
  targetLocale: string
): Promise<string> {
  const lang = localeEnglishName(targetLocale);
  const res = await complete({
    role: "critique", // qwen — strong on id/vi/zh
    model: process.env.QWEN_FAST_MODEL ?? "qwen-flash",
    temperature: 0.2,
    system: `You are a professional football news translator. Translate the article into ${lang}.
RULES:
- Translate faithfully. Do NOT add, remove, or change any fact, name, number, club, position, date or score.
- Do NOT add background or context that is not in the source.
- Use correct ${lang} football terminology. Keep official team/player names accurate.
- Preserve the markdown structure (the first line stays an H1 "# ..." headline, translated).
Return only the translated article in markdown.`,
    user: baseMarkdown,
  });
  return res.text.trim() || baseMarkdown;
}
