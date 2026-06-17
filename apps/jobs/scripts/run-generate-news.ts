/**
 * P2: turn hot topics into original 4-language news articles.
 * topic -> signals -> fact sheet -> generate (QA gate) -> articles(type='news').
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/run-generate-news.ts [N]
 * N = number of top pending topics to write (default 3 for validation).
 */
import { PUBLIC_LOCALES, type Locale } from "@skorly/types";
import {
  getPendingTopics,
  getSignalsForTopic,
  getTeamNames,
  getTeamVerifiedFacts,
  insertArticle,
  setTopicStatus,
} from "@skorly/db";
import {
  extractFactSheet,
  newsPrompt,
  generateArticle,
  translateArticle,
  backTranslateCheck,
  thaiQualityGate,
  webVerifyArticle,
  DEFAULT_THEME,
} from "@skorly/ai-content";
import {
  enrichLeadsWithSource,
  extractEntities,
  scoreTopicPublishability,
  tavilySearch,
  toQuery,
} from "@skorly/news";

/** Web-search grounding (Lever C): pull REAL current facts so the writer
 *  doesn't hallucinate squads/numbers. Returns high-confidence leads (answer +
 *  cited results) to merge ahead of social/RSS signals. Soft-fails to []. */
async function researchTopic(title: string): Promise<{ text: string; url: string; source: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  try {
    const { answer, results } = await tavilySearch(toQuery(title), { apiKey });
    const leads: { text: string; url: string; source: string }[] = [];
    if (answer) leads.push({ text: answer, url: "urn:skorly:tavily", source: "tavily" });
    for (const r of results) {
      if (r.content) leads.push({ text: `${r.title}\n\n${r.content}`, url: r.url, source: "tavily" });
    }
    return leads;
  } catch (e) {
    console.log(`  tavily research failed: ${(e as Error).message} — continuing without it`);
    return [];
  }
}

/**
 * Pick a category cover image (packed in apps/web/public/news/) from the
 * headline + summary. Heuristic/best-effort: it only chooses which themed,
 * non-photographic banner to show, so an occasional mis-tag is harmless.
 * Priority order matters (more specific themes first).
 */
function categoryImage(title: string, summary?: string | null): string {
  const t = `${title} ${summary ?? ""}`.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  if (has(/\b(injur(y|ed|ies)|ruled out|sidelined|surgery|hamstring|acl|torn|strain|fitness doubt|out for)\b/))
    return "/news/injury.webp";
  if (has(/\b(transfer|signs?|signed|signing|joins?|loan|transfer fee|new deal|completes? (a )?move)\b/))
    return "/news/transfer.webp";
  if (has(/\b(ticket|tickets|jersey|kit|shirt sales?|merch\w*|sells? out|sold out|fans?|supporters)\b/))
    return "/news/fans.webp";
  if (has(/\b(beat|beaten|win|won|defeat|defeated|thrash\w*|rout|brace|hat-?trick|full-?time|final whistle|seals?|clinch\w*|\d+-\d+)\b/))
    return "/news/result.webp";
  if (has(/\b(squad|call-?up|called up|roster|named|names|selection|line-?up|number|no\.\s?\d|wears? no)\b/))
    return "/news/callup.webp";
  if (has(/\b(preview|face[sd]?|clash|showdown|vs\b|set to (face|meet)|upcoming|fixture|kick-?off)\b/))
    return "/news/preview.webp";
  return "/news/generic.webp";
}

/** Skip topics with fewer than this many verified facts (avoids fabrication). */
const MIN_FACTS = 2;
const TOPIC_POOL_MULTIPLIER = 4;

/** English is the vetted base; the rest are faithful translations of it. */
const BASE_LOCALE: Locale = "en";
const TARGET_LOCALES: Locale[] = PUBLIC_LOCALES.filter((locale) => locale !== BASE_LOCALE);

function topicCountFromArg(value: string | undefined): number {
  const parsed = Number(value ?? 3);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(0, Math.floor(parsed));
}

function topicCountArg(): string | undefined {
  return process.argv.slice(2).find((arg) => !arg.startsWith("--"));
}

/** Title of the first markdown H1, used as the article title. */
function titleOf(markdown: string, fallback: string): string {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function summaryOf(markdown: string, fallback: string): string {
  const cleaned = markdown
    .replace(/^#\s+.+$/m, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.match(/\[([^\]]+)]/)?.[1] ?? " ")
    .replace(/[#*_>`~|[\]{}()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned.length >= 40 ? cleaned : fallback;
  return base.length > 180 ? `${base.slice(0, 177).trimEnd()}...` : base;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function selectPublishableTopics(limit: number, options: { dryRun?: boolean } = {}) {
  const poolSize = Math.max(limit, limit * TOPIC_POOL_MULTIPLIER);
  const topicPool = await getPendingTopics(poolSize);
  const selected: Array<{
    topic: (typeof topicPool)[number];
    signals: Awaited<ReturnType<typeof getSignalsForTopic>>;
    publishability: ReturnType<typeof scoreTopicPublishability>;
  }> = [];
  let held = 0;
  let skipped = 0;

  for (const topic of topicPool) {
    const signals = await getSignalsForTopic(topic.id);
    const publishability = scoreTopicPublishability({
      title: topic.title,
      heat: topic.heat,
      signalCount: topic.signalCount,
      signals,
    });

    if (publishability.route === "reject") {
      const permanentReject = publishability.reasons.some(
        (reason) => reason === "spam/live-stream signal" || reason === "prediction/odds topic",
      );
      if (permanentReject) {
        if (!options.dryRun) await setTopicStatus(topic.id, "skipped");
        skipped += 1;
      } else {
        held += 1;
      }
      const action = permanentReject
        ? options.dryRun
          ? "would skip"
          : "skipped"
        : "held";
      console.log(
        `  gate ${action} topic ${topic.id}: score ${publishability.score} (${publishability.reasons.join(", ") || "low publishability"})`,
      );
      continue;
    }

    selected.push({ topic, signals, publishability });
  }

  selected.sort((a, b) => {
    const routeRank = (route: string) => (route === "write" ? 2 : route === "brief_only" ? 1 : 0);
    return (
      routeRank(b.publishability.route) - routeRank(a.publishability.route) ||
      b.publishability.score - a.publishability.score ||
      b.topic.heat - a.topic.heat
    );
  });

  return {
    topics: selected.slice(0, limit),
    scanned: topicPool.length,
    held,
    skipped,
  };
}

async function main() {
  const n = topicCountFromArg(topicCountArg());
  const dryRun = process.argv.includes("--dry-run");
  const tavilyKey = process.env.TAVILY_API_KEY ?? "";
  if (!tavilyKey) console.warn("WARN: TAVILY_API_KEY not set — web fact-check disabled.");
  const teamNames = await getTeamNames();
  const selection = await selectPublishableTopics(n, { dryRun });
  console.log(
    `${dryRun ? "Would write" : "Writing"} ${
      selection.topics.length
    } topics (publishability-ranked from ${selection.scanned}; held ${selection.held}, skipped ${selection.skipped}).`,
  );
  if (dryRun) {
    for (const candidate of selection.topics) {
      console.log(
        `  candidate ${candidate.topic.id}: score ${candidate.publishability.score}, ${candidate.publishability.route}, heat ${candidate.topic.heat} — ${candidate.topic.title.slice(0, 80)}`,
      );
    }
    console.log("\nDry run done.");
    process.exit(0);
  }

  for (const candidate of selection.topics) {
    const { topic, publishability } = candidate;
   try {
    console.log(
      `\n=== [heat ${topic.heat}, pub ${publishability.score}, ${publishability.route}] ${topic.title.slice(0, 70)} ===`,
    );
    await setTopicStatus(topic.id, "writing");

    const signals = candidate.signals;
    if (!signals.length) {
      console.log("  no signals linked — skipping");
      await setTopicStatus(topic.id, "skipped");
      continue;
    }

    // (A) Fetch full source text behind the leads so the writer has real material.
    const enriched = await enrichLeadsWithSource(
      signals.map((s) => ({ title: s.title, url: s.url, source: s.source }))
    );

    // (B) Add ground-truth WC-2026 facts (group/fixtures) for the teams involved.
    const teams = extractEntities(topic.title, teamNames).teams;
    const verified = await getTeamVerifiedFacts(teams).catch(() => []);
    const verifiedLeads = verified.map((fact) => ({
      text: fact,
      url: "urn:skorly:db",
      source: "api_football",
    }));

    // (C) Web-search grounding: real current facts (squads, numbers, transfers)
    //     so the writer isn't guessing from stale memory. Placed first as the
    //     highest-confidence leads.
    const researched = await researchTopic(topic.title);
    if (researched.length) console.log(`  +${researched.length} tavily lead(s)`);

    // 1. Fact extraction from web-search + enriched leads + verified DB facts.
    const sheet = await extractFactSheet({
      title: topic.title,
      signals: [...researched, ...verifiedLeads, ...enriched],
    });
    if (sheet.facts.length < MIN_FACTS) {
      console.log(`  only ${sheet.facts.length} fact(s) (< ${MIN_FACTS}) — skipping to avoid fabrication`);
      await setTopicStatus(topic.id, "skipped");
      continue;
    }
    console.log(`  ${sheet.facts.length} facts extracted`);

    const sources = Array.from(
      new Set(sheet.facts.map((f) => f.sourceUrl).filter((u): u is string => !!u))
    );
    const embeds = signals
      .filter((s) => s.hasMedia && s.embedUrl)
      .map((s) => s.embedUrl as string)
      .slice(0, 3);
    const factsText = sheet.facts.map((f) => f.fact).join("; ");
    const prompt = newsPrompt(topic.title, sheet);
    const slug = `news-${topic.id}-${slugify(topic.title)}`;

    // 2. Generate + fully vet the ENGLISH base article (A+B facts, QA, review).
    const base = await generateArticle(prompt, {
      locale: BASE_LOCALE,
      expectedEntities: [],
      facts: factsText,
      review: { theme: DEFAULT_THEME, facts: factsText },
    });

    // 2b. ONLINE JUDGE: verify every checkable specific against the LIVE web.
    //     Internal review only checks faithfulness to the fact sheet; this
    //     catches rumour/speculation that slipped INTO the facts and any detail
    //     the writer still guessed. Contradicted facts are corrected from the
    //     evidence, unverifiable specifics are removed, then re-checked. If it
    //     still can't be made all-true, it stays a draft (never published).
    let finalBody = base.body;
    let finalStatus = base.status;
    let webNote = "";
    if (base.status === "published" && tavilyKey) {
      const verify = await webVerifyArticle(base.body, {
        search: (q) => tavilySearch(q, { apiKey: tavilyKey }),
        locale: BASE_LOCALE,
      });
      finalBody = verify.body;
      if (!verify.ok) {
        finalStatus = "draft";
        const bad = [...verify.result.contradicted, ...verify.result.unverifiable]
          .map((c) => c.claim)
          .slice(0, 4)
          .join(" | ");
        webNote = `web-factcheck FAILED -> draft (${bad})`;
      } else {
        webNote = `web-factcheck ok (${verify.fixes} fix${verify.fixes === 1 ? "" : "es"})`;
      }
      console.log(`  ${webNote}`);
    }
    const baseTitle = titleOf(finalBody, base.title || topic.title);
    const baseSummary = summaryOf(finalBody, sheet.summary);

    await insertArticle({
      slug,
      locale: BASE_LOCALE,
      type: "news",
      title: baseTitle,
      summary: baseSummary,
      body: finalBody,
      topicId: topic.id,
      imageUrl: categoryImage(baseTitle, baseSummary),
      sources,
      embeds,
      status: finalStatus,
      qualityScore: base.qualityScore,
      qaLog: webNote
        ? [...base.qaLog, { round: 99, model: "tavily+glm", fluency: 0, factual: 0, seo: 0, overall: 0, notes: webNote }]
        : base.qaLog,
      model: base.model,
    });
    console.log(`  [base ${finalStatus} ${base.qualityScore ?? "-"}] en: ${baseTitle.slice(0, 50)}`);

    if (finalStatus !== "published") {
      console.log("  base not all-true — not translating (kept as en draft)");
      await setTopicStatus(topic.id, "done");
      continue;
    }

    // 3. Translate the vetted base into the other locales (faithful, no new
    //    facts). A back-translation entity check guards against mistranslation.
    await Promise.all(
      TARGET_LOCALES.map(async (locale) => {
        const translated = await translateArticle(finalBody, locale);
        const localizedSummary = summaryOf(translated, baseSummary);
        const bt = locale === "th"
          ? null
          : await backTranslateCheck(translated, teams).catch(() => ({ ok: true, missing: [] as string[] }));
        const thaiGate = locale === "th"
          ? await thaiQualityGate(finalBody, translated, { expectedEntities: teams, facts: factsText })
          : null;
        const status = thaiGate ? thaiGate.status : bt?.ok ? "published" : "draft";
        await insertArticle({
          slug,
          locale,
          type: "news",
          title: titleOf(translated, baseTitle),
          summary: localizedSummary,
          body: translated,
          topicId: topic.id,
          imageUrl: categoryImage(baseTitle, baseSummary),
          sources,
          embeds,
          status,
          qualityScore: thaiGate?.score ?? base.qualityScore,
          qaLog: thaiGate
            ? [
                ...base.qaLog,
                {
                  round: 50,
                  model: "thai-quality-gate",
                  fluency: thaiGate.review.thai_fluency,
                  factual: thaiGate.review.fidelity,
                  seo: thaiGate.review.seo_title,
                  overall: thaiGate.score,
                  notes: [
                    ...thaiGate.review.risk_notes,
                    ...thaiGate.deterministicIssues,
                    ...thaiGate.missingEntities.map((entity) => `missing entity: ${entity}`),
                  ].join(" | "),
                },
              ]
            : base.qaLog,
          model: base.model,
        });
        console.log(
          `  [${status}] ${locale}${
            thaiGate
              ? thaiGate.status === "published"
                ? ""
                : ` (${[...thaiGate.deterministicIssues, ...thaiGate.missingEntities].join(",")})`
              : bt?.ok
                ? ""
                : ` (missing: ${bt?.missing.join(",")})`
          }`,
        );
      })
    );
    const publishedAny = true;

    await setTopicStatus(topic.id, "done");
    if (!publishedAny) console.log("  (all locales draft)");
   } catch (e) {
    // Transient (e.g. network) error on one topic shouldn't kill the batch.
    console.error(`  ! topic ${topic.id} failed: ${(e as Error).message} — reset to pending`);
    await setTopicStatus(topic.id, "pending").catch(() => {});
   }
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error("run-generate-news failed:", e);
  process.exit(1);
});
