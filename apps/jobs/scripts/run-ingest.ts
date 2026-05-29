/**
 * Local runner for the fixtures ingest (Day 5 validation).
 * Reads DATABASE_URL, API_FOOTBALL_KEY, WC_SEASON from process.env.
 *
 * Usage (env injected inline so secrets never touch the repo):
 *   DATABASE_URL=... API_FOOTBALL_KEY=... WC_SEASON=2022 pnpm tsx apps/jobs/scripts/run-ingest.ts
 */
import { ingestFixtures } from "../src/ingest-fixtures";

async function main() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY missing");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

  const season = process.env.WC_SEASON ? Number(process.env.WC_SEASON) : 2022;
  console.log(`Ingesting World Cup season ${season}...`);
  const result = await ingestFixtures({
    apiKey,
    baseUrl: process.env.API_FOOTBALL_BASE_URL,
    season,
  });
  console.log("Done:", result);
  process.exit(0);
}

main().catch((e) => {
  console.error("Ingest failed:", e);
  process.exit(1);
});
