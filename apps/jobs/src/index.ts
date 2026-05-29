import type { Env } from "./env";
import { hydrateProcessEnv } from "./env";
import { ingestFixtures } from "./ingest-fixtures";
import { generatePreviews } from "./generate-previews";
import { generateRecaps } from "./generate-recaps";

/**
 * Cron router. Each schedule in wrangler.toml maps to a task here.
 * Scheduled handler keeps work light and idempotent; heavy generation is
 * batched and rate-limited inside each task.
 */
export default {
  async scheduled(
    event: { cron: string },
    env: Env,
    ctx: { waitUntil: (p: Promise<unknown>) => void }
  ): Promise<void> {
    hydrateProcessEnv(env);

    switch (event.cron) {
      case "0 */6 * * *":
        ctx.waitUntil(
          ingestFixtures({
            apiKey: env.API_FOOTBALL_KEY,
            baseUrl: env.API_FOOTBALL_BASE_URL,
            season: env.WC_SEASON ? Number(env.WC_SEASON) : undefined,
          })
        );
        break;
      case "*/2 * * * *":
        // live poller (no-op until Phase 1.6); also nudges previews/recaps
        ctx.waitUntil(Promise.all([generatePreviews(env), generateRecaps(env)]));
        break;
      case "*/15 * * * *":
        // TODO: refresh news-sitemap cache
        break;
      default:
        break;
    }
  },

  // Manual trigger endpoint for local testing (wrangler dev).
  async fetch(req: Request, env: Env): Promise<Response> {
    hydrateProcessEnv(env);
    const url = new URL(req.url);
    if (url.pathname === "/__run/ingest") {
      const result = await ingestFixtures({
        apiKey: env.API_FOOTBALL_KEY,
        baseUrl: env.API_FOOTBALL_BASE_URL,
        season: env.WC_SEASON ? Number(env.WC_SEASON) : undefined,
      });
      return Response.json(result);
    }
    return new Response("skorly-jobs ok", { status: 200 });
  },
};
