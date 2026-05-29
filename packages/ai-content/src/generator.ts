import type { QaRound } from "@skorly/types";
import { complete } from "./llm-client";
import type { PromptResult } from "./prompts/types";
import { critique } from "./quality/critique";
import { judge } from "./quality/judge";
import { backTranslateCheck } from "./quality/back-translate";
import { decide, shouldRegenerate, MAX_REGENERATIONS } from "./quality/gate";

export interface GenerateOptions {
  locale?: string;
  /** Entities (team names, score, players) the back-translation must preserve. */
  expectedEntities?: string[];
  /** Known facts string passed to the judge for factual scoring. */
  facts?: string;
  /** Skip critique/judge/back-translate (fast mode for local dev). */
  skipQa?: boolean;
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
    const gen = await complete({
      role: "generate",
      system: prompt.system,
      user: prompt.user,
      temperature: attempt === 0 ? 0.7 : 0.85,
    });
    let body = gen.text.trim();

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
    const decision = decide(round, bt.ok, attempt);

    if (!best || round.overall > best.round.overall) {
      best = { body, round };
    }

    if (decision.status === "published") {
      return {
        body,
        title: extractTitle(body),
        status: "published",
        qualityScore: round.overall,
        qaLog,
        model: gen.model,
      };
    }

    if (!shouldRegenerate(decision, attempt)) break;
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
