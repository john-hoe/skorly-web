/**
 * P1 news radar: fetch signals from all sources -> store -> cluster -> store topics.
 * Does NOT generate articles (validates signal quality first).
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/run-news.ts
 */
import {
  getTeamNames,
  insertSignals,
  upsertTopic,
  linkSignalsToTopic,
  getPendingTopics,
} from "@skorly/db";
import {
  SocialDataAdapter,
  RssAdapter,
  ApiFootballNewsAdapter,
  clusterSignals,
  filterSignals,
  extractEntities,
  X_ACCOUNTS,
  X_KEYWORDS,
  RSS_FEEDS,
  type RawSignal,
  type SourceAdapter,
} from "@skorly/news";

async function main() {
  const teamNames = await getTeamNames();
  console.log(`Loaded ${teamNames.length} team names for entity matching.`);

  const adapters: SourceAdapter[] = [];

  if (process.env.SOCIALDATA_API_KEY) {
    adapters.push(
      new SocialDataAdapter({
        apiKey: process.env.SOCIALDATA_API_KEY,
        accounts: X_ACCOUNTS,
        keywords: X_KEYWORDS,
      })
    );
  } else {
    console.warn("! SOCIALDATA_API_KEY not set — skipping X source");
  }

  adapters.push(new RssAdapter({ feeds: RSS_FEEDS, lang: "en" }));

  if (process.env.API_FOOTBALL_KEY) {
    adapters.push(
      new ApiFootballNewsAdapter({
        apiKey: process.env.API_FOOTBALL_KEY,
        league: 1,
        season: Number(process.env.WC_SEASON ?? 2026),
      })
    );
  }

  // 1. Fetch from all sources
  const all: RawSignal[] = [];
  for (const a of adapters) {
    try {
      const sigs = await a.fetch({ limit: 50 });
      console.log(`  [${a.source}] ${sigs.length} signals`);
      all.push(...sigs);
    } catch (e) {
      console.error(`  [${a.source}] failed:`, (e as Error).message);
    }
  }

  // 2. Entity extraction (teams) for signals missing it
  for (const s of all) {
    if (!s.entities) s.entities = extractEntities(s.title, teamNames);
  }

  // 2.5 Noise filter (drop spam/promo + entity-less keyword leads)
  const clean = filterSignals(all);
  console.log(`\nFiltered ${all.length} → ${clean.length} signals (dropped ${all.length - clean.length} noise).`);

  // 3. Persist raw signals (dedup on url)
  const inserted = await insertSignals(
    clean.map((s) => ({
      source: s.source,
      url: s.url,
      externalId: s.externalId,
      author: s.author,
      title: s.title,
      lang: s.lang,
      entities: s.entities,
      hasMedia: s.hasMedia,
      embedUrl: s.embedUrl,
      publishedAt: s.publishedAt,
    }))
  );
  console.log(`Stored ${inserted} new signals (of ${clean.length} clean).`);

  // 4. Cluster -> topics
  const clusters = clusterSignals(clean);
  let topicCount = 0;
  for (const c of clusters) {
    if (c.heat < 2) continue; // skip low-heat noise
    const topicId = await upsertTopic({
      key: c.key,
      title: c.title,
      entities: c.entities,
      heat: c.heat,
      signalCount: c.signals.length,
    });
    await linkSignalsToTopic(topicId, c.signals.map((s) => s.url));
    topicCount++;
  }
  console.log(`Upserted ${topicCount} topics (heat >= 2).`);

  // 5. Show top pending topics
  const top = await getPendingTopics(10);
  console.log("\nTop pending topics:");
  for (const t of top) {
    console.log(`  [heat ${t.heat}, ${t.signalCount} sig] ${t.title.slice(0, 70)}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("run-news failed:", e);
  process.exit(1);
});
