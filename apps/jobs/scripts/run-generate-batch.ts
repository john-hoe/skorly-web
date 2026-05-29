/**
 * Batch-generate articles for a group's fixtures and persist them.
 * Validates the full content -> QA -> gate -> DB flow on a small slice.
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/run-generate-batch.ts "Group A"
 */
import {
  getFixturesByGroup,
  getStandingsByGroup,
  insertArticle,
  articleExists,
  type FixtureView,
} from "@skorly/db";
import {
  generateArticle,
  previewPrompt,
  watchpointsPrompt,
  predictionPrompt,
  groupAnalysisPrompt,
  type MatchContext,
} from "@skorly/ai-content";

const CONCURRENCY = 3;

function toContext(f: FixtureView): MatchContext {
  return {
    fixture: {
      apiId: 0,
      slug: f.slug,
      groupName: f.groupName,
      stage: f.stage,
      kickoffAt: f.kickoffAt ? f.kickoffAt.toISOString() : null,
      status: f.status as MatchContext["fixture"]["status"],
      home: { apiId: 0, name: f.home.name, slug: f.home.slug },
      away: { apiId: 0, name: f.away.name, slug: f.away.slug },
    },
  };
}

async function genMatch(f: FixtureView) {
  const ctx = toContext(f);
  const entities = [f.home.name, f.away.name];
  const facts = `Match: ${f.home.name} vs ${f.away.name}. Group: ${f.groupName}.`;

  const jobs = [
    { type: "preview", prompt: previewPrompt(ctx) },
    { type: "watchpoints", prompt: watchpointsPrompt(ctx) },
    { type: "prediction", prompt: predictionPrompt(ctx) },
  ] as const;

  for (const job of jobs) {
    const slug = `${f.slug}-${job.type}`;
    if (await articleExists(slug, "id")) {
      console.log(`  [skip] ${job.type} already published`);
      continue;
    }
    const res = await generateArticle(job.prompt, {
      locale: "id",
      expectedEntities: entities,
      facts,
    });
    await insertArticle({
      slug,
      locale: "id",
      type: job.type,
      title: res.title || `${f.home.name} vs ${f.away.name}`,
      summary: null,
      body: res.body,
      fixtureId: f.id,
      groupName: f.groupName,
      status: res.status,
      qualityScore: res.qualityScore,
      qaLog: res.qaLog,
      model: res.model,
    });
    console.log(`  [${res.status} ${res.qualityScore ?? "-"}] ${job.type}: ${res.title.slice(0, 60)}`);
  }
}

async function pool<T>(items: T[], fn: (x: T) => Promise<void>, n: number) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const item = queue.shift()!;
        await fn(item);
      }
    })
  );
}

async function main() {
  const groupName = process.argv[2] ?? "Group A";
  console.log(`Generating articles for ${groupName}...`);

  const fixtures = await getFixturesByGroup(groupName);
  console.log(`${fixtures.length} fixtures.`);

  await pool(
    fixtures,
    async (f) => {
      console.log(`\n${f.home.name} vs ${f.away.name}`);
      await genMatch(f);
    },
    CONCURRENCY
  );

  // One group analysis article.
  const letter = groupName.replace("Group ", "");
  const gaSlug = `grup-${letter.toLowerCase()}-analisis`;
  if (await articleExists(gaSlug, "id")) {
    console.log(`\n[skip] group_analysis already published`);
    console.log("\nDone.");
    process.exit(0);
  }
  const standings = await getStandingsByGroup(groupName);
  const teams = standings.map((s) => s.team.name);
  const ga = await generateArticle(
    groupAnalysisPrompt({ groupName: letter, teams }),
    { locale: "id", expectedEntities: teams.slice(0, 2) }
  );
  await insertArticle({
    slug: gaSlug,
    locale: "id",
    type: "group_analysis",
    title: ga.title || `Analisis Grup ${letter}`,
    body: ga.body,
    groupName,
    status: ga.status,
    qualityScore: ga.qualityScore,
    qaLog: ga.qaLog,
    model: ga.model,
  });
  console.log(`\n[${ga.status} ${ga.qualityScore ?? "-"}] group_analysis: ${ga.title.slice(0, 60)}`);

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Batch failed:", e);
  process.exit(1);
});
