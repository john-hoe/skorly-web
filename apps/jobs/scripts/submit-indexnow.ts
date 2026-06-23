/**
 * Submit recently published or updated article URLs to IndexNow.
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/submit-indexnow.ts --days 14 --limit 1000
 *   pnpm tsx --env-file=.env apps/jobs/scripts/submit-indexnow.ts --url https://skorly.cc/vi/bai-viet/...
 */
import { getArticleSitemapEntries } from "@skorly/db";
import {
  articleUrlForIndexNow,
  recentArticleEntries,
  submitIndexNowUrls,
  uniqueUrls,
} from "../src/indexnow";

interface Args {
  days: number;
  limit: number;
  urls: string[];
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { days: 14, limit: 1000, urls: [], dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--days" && argv[i + 1]) {
      out.days = Math.max(1, Number(argv[++i]) || out.days);
    } else if (arg === "--limit" && argv[i + 1]) {
      out.limit = Math.max(1, Number(argv[++i]) || out.limit);
    } else if (arg === "--url" && argv[i + 1]) {
      out.urls.push(argv[++i]);
    } else if (arg === "--dry-run") {
      out.dryRun = true;
    }
  }
  return out;
}

async function urlsFromRecentArticles(args: Args): Promise<string[]> {
  const entries = await getArticleSitemapEntries();
  const since = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);
  return recentArticleEntries(entries, { since, limit: args.limit }).map((entry) =>
    articleUrlForIndexNow(entry),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const urls = uniqueUrls(args.urls.length ? args.urls : await urlsFromRecentArticles(args));

  console.log(
    `${args.dryRun ? "Would submit" : "Submitting"} ${urls.length} URL(s) to IndexNow` +
      (args.urls.length ? " from explicit --url args." : ` from the last ${args.days} day(s).`),
  );
  for (const url of urls.slice(0, 10)) console.log(`  ${url}`);
  if (urls.length > 10) console.log(`  ... ${urls.length - 10} more`);

  if (args.dryRun || !urls.length) return;

  const result = await submitIndexNowUrls(urls);
  console.log(`IndexNow submitted ${result.submitted} URL(s): HTTP ${result.status} via ${result.endpoint}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
