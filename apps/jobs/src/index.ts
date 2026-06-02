import type { Env } from "./env";
import { hydrateProcessEnv } from "./env";
import { ingestFixtures } from "./ingest-fixtures";
import { generatePreviews } from "./generate-previews";
import { generateRecaps } from "./generate-recaps";
import { scoreFinishedPredictions, seedTeamIdentities } from "@skorly/db";
import { sendNotifications } from "./send-notifications";
import { sendPremiumEmails } from "./send-premium-email";
import { generatePosters } from "./generate-posters";

/** Score finished predictions, then dispatch push (kickoff/goals/results). */
async function scoreAndNotify(): Promise<void> {
  await scoreFinishedPredictions().catch((e) => console.error("[score]", e));
  await sendNotifications().catch((e) => console.error("[notify]", e));
}

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
        // live poller: nudge previews/recaps, score predictions, fire push.
        ctx.waitUntil(
          Promise.all([generatePreviews(env), generateRecaps(env), scoreAndNotify()]),
        );
        break;
      case "*/15 * * * *":
        // pre-match premium email broadcast + enqueue poster prompts.
        ctx.waitUntil(
          Promise.all([
            sendPremiumEmails().catch((e) => console.error("[premium-email]", e)),
            generatePosters().catch((e) => console.error("[posters]", e)),
          ]),
        );
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
    if (url.pathname === "/__run/notify") {
      const result = await scoreAndNotify().then(() => ({ ok: true }));
      return Response.json(result);
    }
    if (url.pathname === "/__run/premium-email") {
      const result = await sendPremiumEmails();
      return Response.json(result);
    }
    if (url.pathname === "/__run/posters") {
      const result = await generatePosters();
      return Response.json(result);
    }
    if (url.pathname === "/__run/seed-identities") {
      const written = await seedTeamIdentities();
      return Response.json({ written });
    }
    return new Response("skorly-jobs ok", { status: 200 });
  },
};
