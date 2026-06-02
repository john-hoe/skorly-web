import { complete } from "../llm-client";

export interface SignalLead {
  text: string;
  url: string;
  source: string;
}

export interface FactSheet {
  summary: string;
  facts: { fact: string; sourceUrl?: string }[];
}

/**
 * Extract verifiable FACTS (not prose) from a set of source leads.
 * We never copy sentences — only distil who/what/when, each tagged with the
 * source URL it came from. Single-source unverifiable claims are dropped.
 */
export async function extractFactSheet(input: {
  title: string;
  signals: SignalLead[];
}): Promise<FactSheet> {
  const leads = input.signals
    .slice(0, 20)
    .map((s, i) => `[${i + 1}] (${s.source}) ${s.text}\n    url: ${s.url}`)
    .join("\n");

  const res = await complete({
    role: "judge", // independent/structured model, temperature 0
    // If GLM is down, fall back to MiniMax-M3, then deepseek-v4-pro. (M3 is a
    // thinking model, so parsing below strips its <think> block.)
    fallback: ["minimax", "deepseek"],
    temperature: 0,
    json: true,
    system:
      "You are a meticulous football news researcher for a site about the 2026 FIFA World Cup (USA/Canada/Mexico, June–July 2026). From the provided source leads (headlines/tweets), extract ONLY verifiable, concrete facts (who/what/when) that are actually stated in the leads. Do NOT copy sentences verbatim. Do NOT infer or add details not present (ages, clubs, dates, edition). If a lead is about a different World Cup edition or unrelated, do not include it. Drop rumors that appear in only one low-credibility source. Return JSON only.",
    user: `Topic: ${input.title}

Source leads:
${leads}

Return JSON:
{"summary": "<one neutral sentence summarizing the event, in your own words>",
 "facts": [{"fact": "<a single fact explicitly supported by a lead, in your own words>", "sourceUrl": "<the url it came from>"}]}

Only include facts genuinely present in the leads. It is better to return few facts than to invent.`,
  });

  try {
    const parsed = JSON.parse(extractJson(res.text)) as FactSheet;
    return {
      summary: parsed.summary ?? input.title,
      facts: Array.isArray(parsed.facts) ? parsed.facts.slice(0, 12) : [],
    };
  } catch {
    return { summary: input.title, facts: [] };
  }
}

/**
 * Pull the JSON object out of a model response. Thinking models (e.g.
 * MiniMax-M3, used as a fallback) prepend a <think>…</think> block before the
 * JSON, which breaks a naive JSON.parse — strip it and take the outermost
 * {…} object.
 */
function extractJson(raw: string): string {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Drop a leading unterminated <think> (response truncated mid-reasoning).
  s = s.replace(/<think>[\s\S]*$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  return start !== -1 && end > start ? s.slice(start, end + 1) : s;
}
