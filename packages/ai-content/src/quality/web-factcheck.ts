import { complete } from "../llm-client";
import { localeEnglishName } from "../locale-meta";

/**
 * Web-grounded fact verification (the "online judge").
 *
 * The internal `reviewArticle` only checks that the article is faithful to the
 * extracted fact sheet — but the fact sheet itself can contain rumour or
 * speculation dressed as fact (e.g. a leak written as an official announcement).
 * This pass closes that gap: it pulls each concrete claim out of the article,
 * searches the LIVE web for evidence, and has a heterogeneous judge rule each
 * claim supported / contradicted / unverifiable against that evidence ONLY.
 *
 * Anything contradicted or unverifiable is sent back to be corrected or removed,
 * and the article is re-checked, until every checkable specific is web-supported
 * (or the article is filed as a draft). No model is allowed to "just know" a
 * fact — it must be backed by a retrieved source.
 */

/** Injected web search (kept abstract so this package doesn't depend on the
 *  news package). Shape matches `tavilySearch`. */
export type WebSearchFn = (query: string) => Promise<{
  answer: string | null;
  results: { title: string; url: string; content: string }[];
}>;

export type ClaimVerdict = "supported" | "contradicted" | "unverifiable";

export interface ClaimResult {
  claim: string;
  verdict: ClaimVerdict;
  reason: string;
  /** For contradicted claims: the correct fact, strictly from the evidence. */
  correctFact?: string;
  sourceUrl?: string;
}

export interface WebFactCheckResult {
  claims: ClaimResult[];
  contradicted: ClaimResult[];
  unverifiable: ClaimResult[];
  /** True when every checkable specific is web-supported. */
  pass: boolean;
}

/** Pull atomic, checkable factual claims (in English, for searching) out of an
 *  article. Generic background / opinion / stable honours are intentionally
 *  skipped — we only verify risky, falsifiable specifics. */
async function extractClaims(article: string, maxClaims: number): Promise<string[]> {
  const res = await complete({
    role: "judge",
    temperature: 0,
    json: true,
    system:
      "You extract checkable factual claims from a 2026 FIFA World Cup news article so they can be verified against live web sources. Only extract SPECIFIC, FALSIFIABLE claims: squad selections/call-ups, jersey numbers, the manager's identity, fixtures/opponents/dates/venues/group letters, scores, transfers, injuries, qualification results. ALWAYS extract any DATE the article asserts (when something was announced, when a match is, etc.) as its own claim with the EXACT date stated, because dates are a common error. SKIP opinion, analysis, generic background, and stable well-known honours (e.g. 'five-time world champions'). Write each claim as a short, self-contained English sentence suitable as a search query. Return JSON only.",
    user: `ARTICLE:\n${article}\n\nReturn JSON: {"claims": ["<one specific checkable claim>", ...]}\nReturn at most ${maxClaims} of the most important checkable claims. If there are no checkable specifics, return {"claims": []}.`,
  });
  try {
    const parsed = JSON.parse(res.text) as { claims?: unknown };
    const claims = Array.isArray(parsed.claims) ? parsed.claims : [];
    return claims
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      .slice(0, maxClaims);
  } catch {
    return [];
  }
}

/** Retrieve web evidence for one claim. Soft-fails to empty evidence. */
async function gatherEvidence(
  claim: string,
  search: WebSearchFn
): Promise<{ text: string; urls: string[] }> {
  try {
    const { answer, results } = await search(claim);
    const parts: string[] = [];
    if (answer) parts.push(`Summary: ${answer}`);
    const top = results.slice(0, 3);
    for (const r of top) {
      parts.push(`(${r.url}) ${r.title}: ${r.content.slice(0, 700)}`);
    }
    return { text: parts.join("\n") || "(no evidence found)", urls: top.map((r) => r.url) };
  } catch {
    return { text: "(search failed — no evidence)", urls: [] };
  }
}

/**
 * Run the full web fact-check on an article.
 */
export async function webFactCheck(
  article: string,
  opts: { search: WebSearchFn; maxClaims?: number }
): Promise<WebFactCheckResult> {
  const maxClaims = opts.maxClaims ?? 6;
  const claims = await extractClaims(article, maxClaims);
  if (!claims.length) {
    return { claims: [], contradicted: [], unverifiable: [], pass: true };
  }

  const evidence = await Promise.all(claims.map((c) => gatherEvidence(c, opts.search)));

  const block = claims
    .map((c, i) => `[${i + 1}] CLAIM: ${c}\nEVIDENCE:\n${evidence[i]?.text ?? "(no evidence)"}`)
    .join("\n\n");

  const res = await complete({
    role: "judge",
    temperature: 0,
    json: true,
    system:
      "You are a rigorous fact-checking judge for 2026 FIFA World Cup (USA/Canada/Mexico, June–July 2026) news. You are given CLAIMS each paired with WEB EVIDENCE retrieved for it. Judge each claim ONLY against its own evidence — never use prior knowledge, never guess, never assume an announcement happened if the evidence doesn't say so. Verdicts: 'supported' = the evidence clearly confirms the claim; 'contradicted' = the evidence clearly states something different or says it is false/not decided; 'unverifiable' = the evidence does not clearly address the claim. Treat leaks/rumours/predictions as NOT confirming a claim stated as fact. DATES MUST MATCH EXACTLY: if a claim's date differs from the evidence's date even by a single day, mark it 'contradicted' and put the correct date from the evidence in correctFact. Only trust evidence clearly about the 2026 edition. For 'contradicted', set correctFact to the accurate fact derived strictly from the evidence (or note that it is not confirmed). Return JSON only.",
    user: `${block}\n\nReturn JSON: {"verdicts": [{"i": <claim number>, "verdict": "supported|contradicted|unverifiable", "reason": "<short>", "correctFact": "<only for contradicted; strictly from evidence>", "sourceUrl": "<best evidence url or empty>"}]}`,
  });

  let verdicts: {
    i?: number;
    verdict?: string;
    reason?: string;
    correctFact?: string;
    sourceUrl?: string;
  }[] = [];
  try {
    const parsed = JSON.parse(res.text) as { verdicts?: typeof verdicts };
    verdicts = Array.isArray(parsed.verdicts) ? parsed.verdicts : [];
  } catch {
    // Fail closed: if the judge output is unparseable, treat all as unverifiable.
    verdicts = [];
  }

  const byIndex = new Map<number, (typeof verdicts)[number]>();
  for (const v of verdicts) if (typeof v.i === "number") byIndex.set(v.i, v);

  const results: ClaimResult[] = claims.map((claim, idx) => {
    const v = byIndex.get(idx + 1);
    const verdict: ClaimVerdict =
      v?.verdict === "supported" || v?.verdict === "contradicted"
        ? v.verdict
        : "unverifiable";
    return {
      claim,
      verdict,
      reason: v?.reason ?? "no verdict returned",
      correctFact: v?.correctFact || undefined,
      sourceUrl: v?.sourceUrl || evidence[idx]?.urls[0],
    };
  });

  const contradicted = results.filter((r) => r.verdict === "contradicted");
  const unverifiable = results.filter((r) => r.verdict === "unverifiable");
  return {
    claims: results,
    contradicted,
    unverifiable,
    pass: contradicted.length === 0 && unverifiable.length === 0,
  };
}

/** Apply web fact-check fixes: correct contradicted claims using the verified
 *  fact, remove unverifiable specifics. Keep everything else intact. Uses a
 *  model heterogeneous to the writer and is forbidden from inventing facts. */
async function applyWebFixes(
  article: string,
  fixes: ClaimResult[],
  locale: string
): Promise<string> {
  if (!fixes.length) return article;
  const langName = localeEnglishName(locale);
  const lines = fixes
    .map((f, i) => {
      if (f.verdict === "contradicted") {
        return f.correctFact
          ? `${i + 1}. WRONG claim: "${f.claim}". Web-verified correction: "${f.correctFact}". Fix the article to state the correct fact, or remove the detail if it no longer fits.`
          : `${i + 1}. UNCONFIRMED/false claim: "${f.claim}". Remove this claim entirely.`;
      }
      return `${i + 1}. UNVERIFIED claim (no source found): "${f.claim}". Remove it or make it non-specific. Do NOT keep the unverified specific.`;
    })
    .join("\n");

  const res = await complete({
    role: "critique",
    temperature: 0,
    system: `You are a copy editor for a football news site. The article is in ${langName}. A web fact-checker found problems. Apply ONLY the listed fixes; keep every other part of the article (structure, headline style, tone, all other content) intact. When correcting, use ONLY the provided web-verified fact — never invent a replacement. If removing a claim leaves a sentence empty, remove the sentence cleanly. Return ONLY the corrected article in ${langName} (markdown, headline on the first line as "# Headline").`,
    user: `FIXES:\n${lines}\n\nARTICLE:\n${article}\n\nReturn the corrected article only — no commentary.`,
  });
  return res.text.trim() || article;
}

export interface WebVerifyResult {
  body: string;
  ok: boolean;
  fixes: number;
  result: WebFactCheckResult;
}

/**
 * Verify an article against the live web and repair it until every checkable
 * specific is web-supported, or give up (caller files it as a draft).
 */
export async function webVerifyArticle(
  article: string,
  opts: { search: WebSearchFn; locale?: string; maxClaims?: number; maxFix?: number }
): Promise<WebVerifyResult> {
  const locale = opts.locale ?? "en";
  const maxFix = opts.maxFix ?? 2;
  let body = article;
  let fixes = 0;

  let result = await webFactCheck(body, { search: opts.search, maxClaims: opts.maxClaims });
  while (!result.pass && fixes < maxFix) {
    body = await applyWebFixes(body, [...result.contradicted, ...result.unverifiable], locale);
    fixes++;
    result = await webFactCheck(body, { search: opts.search, maxClaims: opts.maxClaims });
  }

  return { body, ok: result.pass, fixes, result };
}
