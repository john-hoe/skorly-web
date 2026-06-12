import type { QaRound } from "@skorly/types";
import { complete } from "./llm-client";
import { localizePrompt } from "./prompts/locale";
import type { PromptResult } from "./prompts/types";
import { critique } from "./quality/critique";
import { judge } from "./quality/judge";
import { backTranslateCheck } from "./quality/back-translate";
import { reviewArticle } from "./quality/review";
import { repairArticle } from "./quality/repair";
import { matchesLocaleLanguage } from "./quality/language-check";
import { QUALITY_THRESHOLD, MAX_REGENERATIONS } from "./quality/gate";

export interface GenerateOptions {
  locale?: string;
  /** Entities (team names, score, players) the back-translation must preserve. */
  expectedEntities?: string[];
  /** Known facts string passed to the judge for factual scoring. */
  facts?: string;
  /** Skip critique/judge/back-translate (fast mode for local dev). */
  skipQa?: boolean;
  /**
   * Enable the editorial review pass (on-theme + grounded + correct edition).
   * Articles that fail are regenerated; if still failing they are never
   * published (filed as draft). Used for news to prevent off-theme/fabrication.
   */
  review?: { theme?: string; facts?: string };
}

export interface GeneratedArticle {
  body: string;
  title: string;
  status: "published" | "draft";
  qualityScore: number | null;
  qaLog: QaRound[];
  model: string;
}

/** Extract the first markdown H1 as the title. */
function extractTitle(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() ?? "";
}

/**
 * Full content pipeline: generate -> critique -> judge -> back-translate -> gate.
 * Regenerates up to MAX_REGENERATIONS when the judge score is below threshold.
 */
export async function generateArticle(
  prompt: PromptResult,
  opts: GenerateOptions = {}
): Promise<GeneratedArticle> {
  const locale = opts.locale ?? "id";
  const qaLog: QaRound[] = [];
  let best: { body: string; round: QaRound } | null = null;

  for (let attempt = 0; attempt <= MAX_REGENERATIONS; attempt++) {
    const localized = localizePrompt(prompt, locale);
    const gen = await complete({
      role: "generate",
      system: localized.system,
      user: localized.user,
      temperature: attempt === 0 ? 0.7 : 0.85,
    });
    let body = gen.text.trim();

    // Hard gate: wrong output language is an automatic fail-and-regenerate
    // (the judge scores fluency within a language, it doesn't verify which
    // language the model actually used).
    if (!matchesLocaleLanguage(body, locale)) {
      qaLog.push({
        round: attempt + 1,
        model: gen.model,
        fluency: 0,
        factual: 0,
        seo: 0,
        overall: 0,
        notes: `wrong output language (expected ${locale})`,
      });
      continue;
    }

    if (opts.skipQa) {
      return {
        body,
        title: extractTitle(body),
        status: "published",
        qualityScore: null,
        qaLog,
        model: gen.model,
      };
    }

    body = await critique(body, locale);
    const round = await judge(body, { locale, round: attempt + 1, facts: opts.facts });
    qaLog.push(round);

    const bt = await backTranslateCheck(body, opts.expectedEntities ?? []);

    // Editorial review (opt-in): on-theme + grounded + correct edition.
    let reviewPass = true;
    if (opts.review) {
      const reviewOpts = {
        locale,
        theme: opts.review.theme,
        facts: opts.review.facts ?? opts.facts,
      };
      let rev = await reviewArticle(body, reviewOpts);

      // Targeted repair: if the only problem is ungrounded specifics (on-theme,
      // right edition), surgically strip those exact claims and re-review once
      // instead of re-rolling the whole article. Raises publish rate while
      // keeping the zero-fabrication bar (the repaired text is re-reviewed).
      if (!rev.pass && rev.onTheme && !rev.wrongEdition && rev.unsupportedClaims.length) {
        const repaired = await repairArticle(body, rev.unsupportedClaims, locale);
        const rev2 = await reviewArticle(repaired, reviewOpts);
        if (rev2.pass) {
          body = repaired;
          rev = rev2;
          round.notes = [round.notes, "repaired: removed ungrounded specifics"]
            .filter(Boolean)
            .join(" | ");
        }
      }

      reviewPass = rev.pass;
      if (!rev.pass) {
        round.notes = [round.notes, `review: ${rev.issues.join("; ")}`]
          .filter(Boolean)
          .join(" | ");
      }
    }

    if (!best || round.overall > best.round.overall) {
      best = { body, round };
    }

    const passAll = round.overall >= QUALITY_THRESHOLD && bt.ok && reviewPass;
    if (passAll) {
      return {
        body,
        title: extractTitle(body),
        status: "published",
        qualityScore: round.overall,
        qaLog,
        model: gen.model,
      };
    }
    // else: regenerate (loop) until attempts exhausted, then draft.
  }

  // Nothing crossed the threshold: file the best attempt as draft.
  return {
    body: best?.body ?? "",
    title: extractTitle(best?.body ?? ""),
    status: "draft",
    qualityScore: best?.round.overall ?? null,
    qaLog,
    model: "deepseek",
  };
}
