/**
 * Read-only diagnostics for the news pipeline.
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/report-news-pipeline.ts
 *   pnpm tsx --env-file=.env apps/jobs/scripts/report-news-pipeline.ts --json --hours 24
 */
import { getNewsPipelineReport } from "@skorly/db";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function percent(value: number | null): string {
  return value == null ? "n/a" : `${Math.round(value * 100)}%`;
}

async function main() {
  const json = process.argv.includes("--json");
  const hours = Number(argValue("--hours") ?? 24);
  const target = Number(argValue("--target") ?? process.env.NEWS_PIPELINE_TOPIC_TARGET ?? 6);
  const report = await getNewsPipelineReport({
    hours: Number.isFinite(hours) ? hours : 24,
    configuredTopicCount: Number.isFinite(target) ? target : 6,
  });

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`News pipeline report (${report.hours}h)`);
  console.log(`status: ${report.status}`);
  console.log(`window: ${report.since.toISOString()} -> ${report.generatedAt.toISOString()}`);
  console.log("");
  console.log("Funnel");
  console.log(`  signals inserted: ${report.signalsInserted}`);
  console.log(`  topics updated:    ${report.topicsUpdated}`);
  console.log(`  pending topics:    ${report.pendingTopics}`);
  console.log(`  attempted topics:  ${report.attemptedTopics}`);
  console.log(`  published topics:  ${report.publishedTopics}`);
  console.log(`  draft/skipped:     ${report.draftOrSkippedTopics}`);
  console.log(`  publish rate:      ${percent(report.publishRate)}`);
  console.log(`  articles rows:     ${report.publishedArticles} published / ${report.draftArticles} draft`);

  if (report.signalsBySource.length) {
    console.log("");
    console.log("Signals by source");
    for (const row of report.signalsBySource) {
      console.log(`  ${row.source}: ${row.count}`);
    }
  }

  if (report.draftReasons.length) {
    console.log("");
    console.log("Draft reasons");
    for (const reason of report.draftReasons) {
      console.log(`  ${reason.label}: ${reason.count}`);
    }
  }

  console.log("");
  console.log("Diagnostics");
  for (const line of report.diagnostics) console.log(`  - ${line}`);
  if (report.recommendedActions.length) {
    console.log("");
    console.log("Recommended actions");
    for (const line of report.recommendedActions) console.log(`  - ${line}`);
  }
}

main().catch((error) => {
  console.error("report-news-pipeline failed:", error);
  process.exit(1);
});
