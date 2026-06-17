import { complete } from "../llm-client";
import { TH_FORBIDDEN_TERMS, TH_PIRACY_TERMS } from "../glossary/th-football-terms";
import { backTranslateCheck } from "./back-translate";
import { matchesLocaleLanguage } from "./language-check";

export interface ThaiReviewJson {
  fidelity: number;
  thai_fluency: number;
  football_terms: number;
  seo_title: number;
  has_added_facts: boolean;
  has_gambling_language: boolean;
  has_piracy_language: boolean;
  risk_notes: string[];
}

export interface ThaiQualityResult {
  status: "published" | "draft";
  score: number;
  review: ThaiReviewJson;
  missingEntities: string[];
  deterministicIssues: string[];
  backTranslation: string;
}

function clamp(n: unknown): number {
  const v = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(10, v));
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeDigits(value: string): string {
  const thai = "๐๑๒๓๔๕๖๗๘๙";
  return value.replace(/[๐-๙]/g, (digit) => String(thai.indexOf(digit)));
}

function extractScores(value: string): string[] {
  return Array.from(normalizeDigits(value).matchAll(/\b\d{1,2}\s*[-–]\s*\d{1,2}\b/g)).map((m) =>
    m[0].replace(/\s+/g, ""),
  );
}

function extractYears(value: string): string[] {
  return Array.from(normalizeDigits(value).matchAll(/\b20\d{2}\b/g)).map((m) => m[0]);
}

function titleOf(markdown: string): string {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
}

function bodyWithoutTitle(markdown: string): string {
  return markdown.replace(/^#\s+.+$/m, "").trim();
}

function findTerms(markdown: string, terms: readonly string[]): string[] {
  return terms.filter((term) => markdown.includes(term));
}

function deterministicThaiIssues(baseMarkdown: string, thaiMarkdown: string): string[] {
  const issues: string[] = [];
  const title = titleOf(thaiMarkdown);
  const body = bodyWithoutTitle(thaiMarkdown);
  if (!title) issues.push("missing Thai H1 title");
  if (title.length < 12 || title.length > 90) issues.push("Thai title length outside 12-90 chars");
  if (body.length < 120) issues.push("Thai body is too short");
  if (!matchesLocaleLanguage(thaiMarkdown, "th")) issues.push("Thai language check failed");

  const gambling = findTerms(thaiMarkdown, TH_FORBIDDEN_TERMS);
  if (gambling.length) issues.push(`forbidden gambling terms: ${gambling.join(", ")}`);
  const piracy = findTerms(thaiMarkdown, TH_PIRACY_TERMS);
  if (piracy.length) issues.push(`piracy terms: ${piracy.join(", ")}`);

  const baseScores = extractScores(baseMarkdown);
  const thaiScores = new Set(extractScores(thaiMarkdown));
  for (const score of baseScores) {
    if (!thaiScores.has(score)) issues.push(`missing score ${score}`);
  }

  const baseYears = Array.from(new Set(extractYears(baseMarkdown)));
  const thaiYears = new Set(extractYears(thaiMarkdown));
  for (const year of baseYears) {
    if (!thaiYears.has(year)) issues.push(`missing year ${year}`);
  }

  const residual = thaiMarkdown.toLowerCase();
  const residueHits = ["berita", "jadwal", "prediksi", "pertandingan", "world cup"]
    .filter((word) => residual.includes(word));
  if (residueHits.length > 3) {
    issues.push(`possible untranslated residue: ${residueHits.join(", ")}`);
  }
  const unsafeEnglishResidue = ["stake", "stakes", "bookies", "bookmaker", "odds"]
    .filter((word) => new RegExp(`\\b${word}\\b`, "i").test(thaiMarkdown));
  if (unsafeEnglishResidue.length) {
    issues.push(`unsafe English residue: ${unsafeEnglishResidue.join(", ")}`);
  }
  return issues;
}

async function reviewThaiTranslation(
  baseMarkdown: string,
  thaiMarkdown: string,
  facts?: string,
): Promise<ThaiReviewJson> {
  const res = await complete({
    role: "judge",
    temperature: 0,
    json: true,
    system:
      "You are a strict Thai football editor. Review a Thai translation against its English source. Return JSON only. Neutral model probabilities, Elo ratings, Poisson model notes and score predictions are allowed; flag gambling only for betting calls, bookmaker/odds language, staking advice, gambling keywords or sportsbook-style promotion.",
    user: `SOURCE ENGLISH ARTICLE:
${baseMarkdown}

${facts ? `KNOWN FACTS:\n${facts}\n\n` : ""}THAI TRANSLATION:
${thaiMarkdown}

Score the Thai translation 0-10 and flag risks. Use these exact keys:
{
  "fidelity": 0,
  "thai_fluency": 0,
  "football_terms": 0,
  "seo_title": 0,
  "has_added_facts": false,
  "has_gambling_language": false,
  "has_piracy_language": false,
  "risk_notes": []
}

Gambling policy:
- Allowed: neutral model probability, win probability, draw probability, Elo, Poisson model, score prediction.
- Not allowed: betting advice, bookmaker odds, handicap/market language, staking recommendations, gambling-site wording, or Thai gambling keywords.`,
  });

  let parsed: Partial<ThaiReviewJson> = {};
  try {
    parsed = JSON.parse(res.text) as Partial<ThaiReviewJson>;
  } catch {
    parsed = { risk_notes: ["unparseable Thai review output"] };
  }

  return {
    fidelity: clamp(parsed.fidelity),
    thai_fluency: clamp(parsed.thai_fluency),
    football_terms: clamp(parsed.football_terms),
    seo_title: clamp(parsed.seo_title),
    has_added_facts: parsed.has_added_facts === true,
    has_gambling_language: parsed.has_gambling_language === true,
    has_piracy_language: parsed.has_piracy_language === true,
    risk_notes: arrayOfStrings(parsed.risk_notes),
  };
}

export async function thaiQualityGate(
  baseMarkdown: string,
  thaiMarkdown: string,
  opts: { expectedEntities?: string[]; facts?: string } = {},
): Promise<ThaiQualityResult> {
  const [review, backTranslation] = await Promise.all([
    reviewThaiTranslation(baseMarkdown, thaiMarkdown, opts.facts),
    backTranslateCheck(thaiMarkdown, opts.expectedEntities ?? []),
  ]);
  const deterministicIssues = deterministicThaiIssues(baseMarkdown, thaiMarkdown);
  const score = Math.round(
    ((review.fidelity + review.thai_fluency + review.football_terms + review.seo_title) / 4) *
      10,
  ) / 10;
  const status =
    review.fidelity >= 9 &&
    review.thai_fluency >= 8 &&
    review.football_terms >= 8 &&
    review.seo_title >= 8 &&
    !review.has_added_facts &&
    !review.has_gambling_language &&
    !review.has_piracy_language &&
    backTranslation.ok &&
    deterministicIssues.length === 0
      ? "published"
      : "draft";

  return {
    status,
    score,
    review,
    missingEntities: backTranslation.missing,
    deterministicIssues,
    backTranslation: backTranslation.english,
  };
}
