/**
 * Local runner to smoke-test the AI content pipeline (Day 4/6).
 * Uses a hardcoded match context (no DB) to isolate the LLM path.
 *
 * Env: DEEPSEEK_* (+ OPENROUTER_*, QWEN_* if running full QA).
 * Set GEN_SKIP_QA=1 to test generation only (no critique/judge/back-translate).
 */
import { generateArticle, previewPrompt } from "@skorly/ai-content";
import type { MatchContext } from "@skorly/ai-content";

async function main() {
  const ctx: MatchContext = {
    fixture: {
      apiId: 0,
      slug: "argentina-vs-australia",
      groupName: null,
      stage: "knockout",
      kickoffAt: "2026-06-15T19:00:00Z",
      status: "scheduled",
      home: { apiId: 0, name: "Argentina", slug: "argentina" },
      away: { apiId: 0, name: "Australia", slug: "australia" },
    },
    homeForm: ["W", "W", "D", "W", "W"],
    awayForm: ["L", "W", "D", "L", "W"],
    keyPlayersHome: ["Lionel Messi", "Julian Alvarez"],
    keyPlayersAway: ["Mathew Ryan", "Jackson Irvine"],
    headToHead: "Argentina menang 2-1 di babak 16 besar Piala Dunia 2022.",
  };

  console.log(`Generating preview: ${ctx.fixture.home.name} vs ${ctx.fixture.away.name}`);
  console.log(`Mode: ${process.env.GEN_SKIP_QA === "1" ? "generation only" : "full QA pipeline"}\n`);

  const t0 = Date.now();
  const result = await generateArticle(previewPrompt(ctx), {
    locale: "id",
    expectedEntities: [ctx.fixture.home.name, ctx.fixture.away.name],
    facts: `Match: ${ctx.fixture.home.name} vs ${ctx.fixture.away.name}.`,
    skipQa: process.env.GEN_SKIP_QA === "1",
  });

  console.log("===== RESULT (" + ((Date.now() - t0) / 1000).toFixed(1) + "s) =====");
  console.log("status:", result.status);
  console.log("qualityScore:", result.qualityScore);
  console.log("model:", result.model);
  if (result.qaLog.length) console.log("qaLog:", JSON.stringify(result.qaLog, null, 2));
  console.log("title:", result.title);
  console.log("\n----- BODY -----\n");
  console.log(result.body);
  process.exit(0);
}

main().catch((e) => {
  console.error("Generation failed:", e);
  process.exit(1);
});
