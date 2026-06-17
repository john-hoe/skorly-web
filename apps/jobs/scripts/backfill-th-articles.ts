/**
 * Faithfully translate published source articles into Thai with a strict QA gate.
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --dry-run --limit 5
 *   pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --limit 30
 *   pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --limit 320 --publish
 */
import {
  getArticleLocaleStatus,
  getFixtureTeamNames,
  getPublishedArticlesForBackfill,
  getStandingsByGroup,
  insertArticle,
  type ArticleBackfillSource,
} from "@skorly/db";
import {
  fitThaiArticleHeadline,
  reviseThaiArticleTranslation,
  thaiQualityGate,
  translateArticle,
} from "@skorly/ai-content";

interface Args {
  dryRun: boolean;
  publish: boolean;
  limit: number;
  type?: string;
  source: string;
  target: string;
  concurrency: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = {
    dryRun: false,
    publish: false,
    limit: 5,
    source: "en",
    target: "th",
    concurrency: 1,
  };
  const readValue = (inline: string | undefined, index: number) => {
    if (inline !== undefined) return { value: inline, nextIndex: index };
    return { value: args[index + 1], nextIndex: index + 1 };
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const eq = arg.indexOf("=");
    const flag = eq >= 0 ? arg.slice(0, eq) : arg;
    const inline = eq >= 0 ? arg.slice(eq + 1) : undefined;
    if (flag === "--dry-run") out.dryRun = inline === undefined ? true : inline !== "false";
    else if (flag === "--publish") out.publish = inline === undefined ? true : inline !== "false";
    else if (flag === "--limit") {
      const next = readValue(inline, i);
      if (next.value) out.limit = Number(next.value);
      i = next.nextIndex;
    } else if (flag === "--type") {
      const next = readValue(inline, i);
      if (next.value) out.type = next.value;
      i = next.nextIndex;
    } else if (flag === "--source") {
      const next = readValue(inline, i);
      if (next.value) out.source = next.value;
      i = next.nextIndex;
    } else if (flag === "--target") {
      const next = readValue(inline, i);
      if (next.value) out.target = next.value;
      i = next.nextIndex;
    } else if (flag === "--concurrency") {
      const next = readValue(inline, i);
      if (next.value) out.concurrency = Number(next.value);
      i = next.nextIndex;
    }
  }
  return {
    ...out,
    limit: Number.isFinite(out.limit) && out.limit > 0 ? Math.floor(out.limit) : 5,
    concurrency:
      Number.isFinite(out.concurrency) && out.concurrency > 0
        ? Math.min(Math.floor(out.concurrency), 4)
        : 1,
  };
}

function titleOf(markdown: string, fallback: string): string {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function summaryOf(markdown: string, fallback: string | null): string {
  const cleaned = markdown
    .replace(/^#\s+.+$/m, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.match(/\[([^\]]+)]/)?.[1] ?? " ")
    .replace(/[#*_>`~|[\]{}()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned.length >= 40 ? cleaned : fallback ?? cleaned;
  return base.length > 180 ? `${base.slice(0, 177).trimEnd()}...` : base;
}

function sourceMarkdown(article: ArticleBackfillSource): string {
  const body = article.body.trim();
  return body.startsWith("#") ? body : `# ${article.title}\n\n${body}`;
}

async function expectedEntities(article: ArticleBackfillSource): Promise<string[]> {
  if (article.fixtureId) return getFixtureTeamNames(article.fixtureId).catch(() => []);
  if (article.groupName) {
    const standings = await getStandingsByGroup(article.groupName).catch(() => []);
    return standings.map((s) => s.team.name).filter(Boolean).slice(0, 6);
  }
  return [];
}

type ThaiGate = Awaited<ReturnType<typeof thaiQualityGate>>;

function qaLogFor(source: ArticleBackfillSource, gate: ThaiGate, attempt: number) {
  return [
    {
      round: attempt,
      model: "thai-quality-gate",
      fluency: gate.review.thai_fluency,
      factual: gate.review.fidelity,
      seo: gate.review.seo_title,
      overall: gate.score,
      notes: [
        `source=${source.locale}:${source.id}`,
        `attempt=${attempt}`,
        `terms=${gate.review.football_terms}`,
        gate.review.has_added_facts ? "added facts" : "",
        gate.review.has_gambling_language ? "gambling language" : "",
        gate.review.has_piracy_language ? "piracy language" : "",
        ...gate.review.risk_notes,
        ...gate.deterministicIssues,
        ...gate.missingEntities.map((entity) => `missing entity: ${entity}`),
      ]
        .filter(Boolean)
        .join(" | "),
    },
  ];
}

function revisionFeedback(gate: ThaiGate): string {
  const lines = gateFailureReasons(gate);
  return lines.join("\n");
}

function gateFailureReasons(gate: ThaiGate): string[] {
  return [
    `fidelity=${gate.review.fidelity} (required >=9)`,
    `thai_fluency=${gate.review.thai_fluency} (required >=8)`,
    `football_terms=${gate.review.football_terms} (required >=8)`,
    `seo_title=${gate.review.seo_title} (required >=8)`,
    gate.review.has_added_facts ? "Remove any facts not present in the English source." : "",
    gate.review.has_gambling_language ? "Remove all gambling language." : "",
    gate.review.has_piracy_language ? "Remove all piracy or illegal streaming language." : "",
    ...gate.review.risk_notes.map((note) => `review note: ${note}`),
    ...gate.deterministicIssues.map((issue) => `deterministic issue: ${issue}`),
    ...gate.missingEntities.map((entity) => `missing entity: ${entity}`),
  ].filter(Boolean).filter((line) => {
    if (line.startsWith("fidelity=")) return gate.review.fidelity < 9;
    if (line.startsWith("thai_fluency=")) return gate.review.thai_fluency < 8;
    if (line.startsWith("football_terms=")) return gate.review.football_terms < 8;
    if (line.startsWith("seo_title=")) return gate.review.seo_title < 8;
    return true;
  });
}

async function translateWithThaiGate(
  base: string,
  entities: string[],
  facts: string,
): Promise<{ translated: string; gate: ThaiGate; attempt: number }> {
  const model = process.env.QWEN_TH_BACKFILL_MODEL ?? process.env.QWEN_MODEL ?? "qwen3.7-max";
  let translated = await translateArticle(base, "th", { model });
  translated = await fitThaiArticleHeadline(base, translated, { model });
  let gate = await thaiQualityGate(base, translated, { expectedEntities: entities, facts });
  let attempt = 1;

  if (gate.status === "draft") {
    const revised = await reviseThaiArticleTranslation(base, translated, revisionFeedback(gate), { model });
    const fitted = await fitThaiArticleHeadline(base, revised, { model });
    const revisedGate = await thaiQualityGate(base, fitted, { expectedEntities: entities, facts });
    const saferDraft =
      revisedGate.score > gate.score &&
      revisedGate.deterministicIssues.length <= gate.deterministicIssues.length &&
      revisedGate.missingEntities.length <= gate.missingEntities.length &&
      !revisedGate.review.has_added_facts &&
      !revisedGate.review.has_gambling_language &&
      !revisedGate.review.has_piracy_language;
    if (revisedGate.status === "published" || saferDraft) {
      translated = fitted;
      gate = revisedGate;
      attempt = 2;
    }
  }

  return { translated, gate, attempt };
}

async function processArticle(article: ArticleBackfillSource, args: Args) {
  const existingStatus = await getArticleLocaleStatus(article.slug, args.target);
  if (existingStatus === "published") {
    console.log(`  [skip] ${article.slug} already has published ${args.target}`);
    return { skipped: 1, published: 0, draft: 0, dryRun: 0 };
  }
  if (existingStatus === "draft") {
    console.log(`  [update-draft] ${article.slug} already has draft ${args.target}`);
  }

  const base = sourceMarkdown(article);
  const entities = await expectedEntities(article);
  const facts = [
    `Source article: ${article.title}.`,
    `Type: ${article.type}.`,
    article.groupName ? `Group: ${article.groupName}.` : "",
    entities.length ? `Entities: ${entities.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const { translated, gate, attempt } = await translateWithThaiGate(base, entities, facts);
  const status = args.publish ? gate.status : "draft";
  const title = titleOf(translated, article.title);
  const summary = summaryOf(translated, article.summary);

  const notes = [
    `fidelity=${gate.review.fidelity}`,
    `fluency=${gate.review.thai_fluency}`,
    `terms=${gate.review.football_terms}`,
    `seo=${gate.review.seo_title}`,
    gate.status === "draft" ? `reasons=${gateFailureReasons(gate).join(";") || "unknown"}` : "",
    gate.deterministicIssues.length ? `issues=${gate.deterministicIssues.join(";")}` : "",
    gate.missingEntities.length ? `missing=${gate.missingEntities.join(",")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (args.dryRun) {
    console.log(`  [dry-run ${gate.status} score=${gate.score} attempt=${attempt}] ${article.slug} ${notes}`);
    return { skipped: 0, published: 0, draft: 0, dryRun: 1 };
  }

  await insertArticle({
    slug: article.slug,
    locale: args.target,
    type: article.type,
    title,
    summary,
    body: translated,
    fixtureId: article.fixtureId,
    teamId: article.teamId,
    groupName: article.groupName,
    topicId: article.topicId,
    imageUrl: article.imageUrl,
    sources: article.sources,
    embeds: article.embeds,
    status,
    qualityScore: gate.score,
    qaLog: qaLogFor(article, gate, attempt),
    model: attempt > 1 ? "thai-backfill:qwen+quality-gate+revise" : "thai-backfill:qwen+quality-gate",
  });
  console.log(`  [${status} score=${gate.score} attempt=${attempt}] ${article.slug} ${notes}`);
  return {
    skipped: 0,
    published: status === "published" ? 1 : 0,
    draft: status === "draft" ? 1 : 0,
    dryRun: 0,
  };
}

async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const queue = [...items];
  const out: R[] = [];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const item = queue.shift()!;
        out.push(await fn(item));
      }
    }),
  );
  return out;
}

async function main() {
  const args = parseArgs();
  if (args.target !== "th") {
    throw new Error("This script is intentionally scoped to --target th");
  }
  console.log(
    `Thai backfill source=${args.source} target=${args.target} limit=${args.limit}` +
      (args.type ? ` type=${args.type}` : "") +
      (args.dryRun ? " dry-run" : "") +
      (args.publish ? " publish-enabled" : " force-draft"),
  );

  const articles = await getPublishedArticlesForBackfill({
    sourceLocale: args.source,
    limit: args.limit,
    type: args.type,
  });
  console.log(`${articles.length} source articles loaded.`);

  const results = await pool(articles, args.concurrency, (article) => processArticle(article, args));
  const totals = results.reduce(
    (acc, item) => ({
      skipped: acc.skipped + item.skipped,
      published: acc.published + item.published,
      draft: acc.draft + item.draft,
      dryRun: acc.dryRun + item.dryRun,
    }),
    { skipped: 0, published: 0, draft: 0, dryRun: 0 },
  );
  console.log(
    `Done. dryRun=${totals.dryRun} published=${totals.published} draft=${totals.draft} skipped=${totals.skipped}`,
  );
}

main().catch((error) => {
  console.error("backfill-th-articles failed:", error);
  process.exit(1);
});
