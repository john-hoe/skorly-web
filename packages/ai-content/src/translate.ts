import { complete } from "./llm-client";
import { localeEnglishName } from "./locale-meta";
import { thaiGlossaryBlock } from "./glossary/th-football-terms";

function markdownTitle(markdown: string): string {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
}

function replaceMarkdownTitle(markdown: string, title: string): string {
  return markdown.replace(/^#\s+.+$/m, `# ${title}`);
}

/**
 * Faithfully translate an approved base article into a target language.
 * A translator can only render what's there — it cannot invent new facts —
 * so the translation inherits the (already-vetted) accuracy of the base.
 * Uses a fast non-thinking model; instructions force literal fidelity.
 */
export async function translateArticle(
  baseMarkdown: string,
  targetLocale: string,
  opts: { model?: string } = {},
): Promise<string> {
  const lang = localeEnglishName(targetLocale);
  const thaiRules =
    targetLocale === "th"
      ? `\n\nThai glossary and safety rules:
- Keep the translated Thai H1 headline between 12 and 90 characters.
${thaiGlossaryBlock()}`
      : "";
  const res = await complete({
    role: "critique", // qwen — strong on id/vi/zh
    model: opts.model ?? process.env.QWEN_FAST_MODEL ?? "qwen-flash",
    temperature: 0.2,
    system: `You are a professional football news translator. Translate the article into ${lang}.
RULES:
- Translate faithfully. Do NOT add, remove, or change any fact, name, number, club, position, date or score.
- Do NOT add background or context that is not in the source.
- Use correct ${lang} football terminology. Keep official team/player names accurate.
- Preserve country abbreviations accurately. In Indonesian, translate "USA" as "Amerika Serikat" or keep "USA"; never write "ASI".
- Preserve the markdown structure (the first line stays an H1 "# ..." headline, translated).
${thaiRules}
Return only the translated article in markdown.`,
    user: baseMarkdown,
  });
  return res.text.trim() || baseMarkdown;
}

/** Keep Thai article H1 inside deterministic publish constraints. */
export async function fitThaiArticleHeadline(
  baseMarkdown: string,
  thaiMarkdown: string,
  opts: { model?: string } = {},
): Promise<string> {
  const current = markdownTitle(thaiMarkdown);
  if (current.length >= 12 && current.length <= 90) return thaiMarkdown;

  const res = await complete({
    role: "critique",
    model: opts.model ?? process.env.QWEN_FAST_MODEL ?? "qwen-flash",
    temperature: 0.1,
    system: `Rewrite one Thai football article headline.
Rules:
- Return only the headline text, without markdown "#".
- Length must be between 12 and 90 Thai characters.
- Preserve the source meaning, teams, dates and match context.
- Do not add betting, odds, streaming, injury or lineup claims.
- Use natural Thai football wording.`,
    user: `ENGLISH SOURCE ARTICLE:
${baseMarkdown}

CURRENT THAI HEADLINE:
${current}`,
  });
  const next = res.text.replace(/^#\s*/, "").split("\n")[0]?.trim() ?? "";
  if (next.length < 12 || next.length > 90) {
    if (current.length > 90) {
      return replaceMarkdownTitle(thaiMarkdown, `${current.slice(0, 87).trimEnd()}...`);
    }
    return thaiMarkdown;
  }
  return replaceMarkdownTitle(thaiMarkdown, next);
}

/** Revise a Thai translation after QA flags. The QA gate still decides status. */
export async function reviseThaiArticleTranslation(
  baseMarkdown: string,
  thaiMarkdown: string,
  feedback: string,
  opts: { model?: string } = {},
): Promise<string> {
  const res = await complete({
    role: "critique",
    model: opts.model ?? process.env.QWEN_FAST_MODEL ?? "qwen-flash",
    temperature: 0.1,
    system: `You are a professional Thai football translation editor.
Revise the Thai markdown translation so it passes editorial QA.
Rules:
- Preserve every fact, name, team, number, date and score from the English source.
- Do not add background, betting advice, streaming links, injury news, lineup claims or context not in the source.
- Preserve markdown structure and keep the first line as an H1 "# ..." headline.
- Keep the Thai H1 headline between 12 and 90 characters.
- Use natural Thai football terminology and the glossary below.
${thaiGlossaryBlock()}
Return only the revised Thai article in markdown.`,
    user: `ENGLISH SOURCE:
${baseMarkdown}

CURRENT THAI TRANSLATION:
${thaiMarkdown}

QA FEEDBACK TO FIX:
${feedback}`,
  });
  return res.text.trim() || thaiMarkdown;
}
