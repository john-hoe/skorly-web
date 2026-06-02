import { complete } from "../llm-client";
import { localeEnglishName } from "../locale-meta";

export interface ReviewResult {
  pass: boolean;
  onTheme: boolean;
  grounded: boolean;
  wrongEdition: boolean;
  issues: string[];
  /** Risky/checkable specifics the writer added that aren't in the facts.
   *  Drives the targeted repair pass (remove these, keep the rest). */
  unsupportedClaims: string[];
}

export interface ReviewOptions {
  locale?: string;
  /** The editorial theme the article must match. */
  theme?: string;
  /** Verified facts the article must stay grounded in. */
  facts?: string;
}

export const DEFAULT_THEME =
  "the 2026 FIFA World Cup (hosted in the USA, Canada and Mexico, June–July 2026) and its teams, players and matches";

/**
 * Pass 5: editorial review. Rejects articles that are off-theme, ungrounded
 * (contain claims beyond the provided facts), or reference the wrong tournament
 * edition (e.g. Qatar / 2022). Returns pass=false to trigger regeneration.
 */
export async function reviewArticle(
  article: string,
  opts: ReviewOptions = {}
): Promise<ReviewResult> {
  const theme = opts.theme ?? DEFAULT_THEME;
  const facts = opts.facts ?? "";
  const langName = localeEnglishName(opts.locale ?? "id");

  // Cheap deterministic guard for the exact wrong-edition failure mode.
  const factsLower = (facts + " " + theme).toLowerCase();
  const wrongEditionHint =
    /\bqatar\b|\b2022\b|\brussia 2018\b|\b2018\b/i.test(article) &&
    !/qatar|2022|2018/.test(factsLower);

  const res = await complete({
    role: "judge",
    temperature: 0,
    json: true,
    system: `You are a fact-checking editor for a football news site about ${theme}. The article is written in ${langName}. Your job is to catch FABRICATION (invented or wrong specifics), not to punish accurate well-known background. Return JSON only.`,
    user: `Check the article against the FACTS.

1) ON-THEME: it must be about ${theme}. A different competition or World Cup edition = fail.
2) WRONG-EDITION: references to a past World Cup (Qatar 2022, Russia 2018, etc.) not in the facts = fail.
3) GROUNDED — flag ONLY risky fabrication, i.e. a specific that could be WRONG and is neither in the facts nor uncontroversial public knowledge:
   - DO flag: a player's club, position, age, squad number; a manager's name; specific scores, dates, venues, group letters; injury specifics — when these are NOT in the facts (the writer may have guessed them).
   - DO NOT flag widely-known, stable, true background: national-team nicknames (e.g. "Seleção", "Three Lions"), all-time honours ("five-time world champions"), confederation names (FIFA, UEFA, CBF), or generic phrasing. These are acceptable even if not in the facts.
   If you list any item in unsupportedClaims, it must be a risky/checkable specific of the first kind — NOT harmless public knowledge.

FACTS (the allowed source of match/event specifics):
${facts || "(none provided)"}

ARTICLE:
${article}

Return JSON:
{"onTheme": <true|false>,
 "wrongEdition": <true|false>,
 "grounded": <true if no risky fabricated specifics>,
 "unsupportedClaims": ["<only risky/checkable specifics not in facts>", ...],
 "issues": ["<short issue>", ...]}`,
  });

  let parsed: Partial<ReviewResult> = {};
  try {
    parsed = JSON.parse(res.text);
  } catch {
    // If the reviewer output is unparseable, fail closed (do not publish).
    return {
      pass: false,
      onTheme: false,
      grounded: false,
      wrongEdition: false,
      issues: ["unparseable reviewer output"],
      unsupportedClaims: [],
    };
  }

  const unsupported = Array.isArray(
    (parsed as { unsupportedClaims?: string[] }).unsupportedClaims
  )
    ? (parsed as { unsupportedClaims: string[] }).unsupportedClaims
    : [];
  const onTheme = parsed.onTheme !== false;
  // Fail grounding if the reviewer said so OR listed any unsupported specific.
  const grounded = parsed.grounded !== false && unsupported.length === 0;
  const wrongEdition = parsed.wrongEdition === true || wrongEditionHint;
  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
  for (const u of unsupported) issues.push(`unsupported: ${u}`);
  if (wrongEditionHint && !issues.includes("references wrong World Cup edition")) {
    issues.push("references wrong World Cup edition");
  }

  return {
    pass: onTheme && grounded && !wrongEdition,
    onTheme,
    grounded,
    wrongEdition,
    issues,
    unsupportedClaims: unsupported,
  };
}
