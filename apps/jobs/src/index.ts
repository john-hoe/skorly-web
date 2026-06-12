import type { Env } from "./env";
import { hydrateProcessEnv } from "./env";
import { ingestFixtures } from "./ingest-fixtures";
import { ingestLiveFixtures } from "./ingest-live";
import { generatePreviews } from "./generate-previews";
import { generateRecaps } from "./generate-recaps";
import {
  acquireJobLock,
  releaseJobLock,
  scoreFinishedPredictions,
  seedTeamIdentities,
  setDbClientCacheEnabled,
} from "@skorly/db";
import { sendNotifications } from "./send-notifications";
import { sendPremiumEmails } from "./send-premium-email";
import { sendDailyDigest } from "./send-daily-digest";
import { makeAiPredictions } from "./ai-predictions";
import { fetchHighlights } from "./fetch-highlights";
import { generatePosters } from "./generate-posters";

setDbClientCacheEnabled(false);

const RUN_PATH_PREFIX = "/__run/";
const ADMIN_SECRET_HEADER = "x-admin-secret";
const LOCK_INGEST = "jobs:ingest";
const LOCK_SCORE_NOTIFY = "jobs:score-and-notify";
const LOCK_PREMIUM_EMAIL = "jobs:premium-email";
const LOCK_POSTERS = "jobs:posters";
const LOCK_SEED_IDENTITIES = "jobs:seed-identities";
const LOCK_LIVE_INGEST = "jobs:live-ingest";
const LOCK_DAILY_DIGEST = "jobs:daily-digest";
const LOCK_AI_PREDICTIONS = "jobs:ai-predictions";
const LOCK_HIGHLIGHTS = "jobs:highlights";

type ExclusiveResult<T> =
  | { acquired: true; value: T }
  | { acquired: false; reason: "locked" | "lock_error" };

/** Score finished predictions, then dispatch push (kickoff/goals/results). */
async function scoreAndNotify(): Promise<void> {
  await scoreFinishedPredictions().catch((e) => console.error("[score]", e));
  await sendNotifications().catch((e) => console.error("[notify]", e));
}

async function digest(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function hasAdminSecret(req: Request, env: Env): Promise<boolean> {
  const expected = env.JOBS_ADMIN_SECRET;
  const supplied = req.headers.get(ADMIN_SECRET_HEADER);
  if (!expected || !supplied) return false;

  const [expectedDigest, suppliedDigest] = await Promise.all([
    digest(expected),
    digest(supplied),
  ]);
  return equalBytes(expectedDigest, suppliedDigest);
}

async function redisPipeline(env: Env, commands: unknown[][]): Promise<Array<{ result?: unknown }>> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash Redis is not configured");

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    throw new Error(`Upstash Redis command failed: ${res.status}`);
  }
  return (await res.json()) as Array<{ result?: unknown }>;
}

function redisLockEnabled(env: Env): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

function redisLockKey(name: string): string {
  return `job-lock:${name}`;
}

async function acquireExclusiveJobLock(
  env: Env,
  name: string,
  owner: string,
  ttlSeconds: number,
): Promise<boolean> {
  if (!redisLockEnabled(env)) {
    return acquireJobLock(name, owner, ttlSeconds);
  }

  const rows = await redisPipeline(env, [
    ["SET", redisLockKey(name), owner, "NX", "EX", String(ttlSeconds)],
  ]);
  return rows[0]?.result === "OK";
}

async function releaseExclusiveJobLock(env: Env, name: string, owner: string): Promise<void> {
  if (!redisLockEnabled(env)) {
    await releaseJobLock(name, owner);
    return;
  }

  const script =
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
  await redisPipeline(env, [["EVAL", script, "1", redisLockKey(name), owner]]);
}

function unauthorized(): Response {
  return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function methodNotAllowed(): Response {
  return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

function sanitizedErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]").slice(0, 240);
}

async function tryRunExclusive<T>(
  env: Env,
  name: string,
  ttlSeconds: number,
  task: () => Promise<T>,
): Promise<ExclusiveResult<T>> {
  const owner = crypto.randomUUID();
  let acquired = false;
  try {
    acquired = await acquireExclusiveJobLock(env, name, owner, ttlSeconds);
  } catch (error) {
    console.error(`[lock] acquire failed for ${name}`, error);
    return { acquired: false, reason: "lock_error" };
  }

  if (!acquired) return { acquired: false, reason: "locked" };

  try {
    return { acquired: true, value: await task() };
  } finally {
    await releaseExclusiveJobLock(env, name, owner).catch((error) => {
      console.error(`[lock] release failed for ${name}`, error);
    });
  }
}

async function runScoreAndNotifyExclusive(env: Env): Promise<ExclusiveResult<{ ok: true }>> {
  return tryRunExclusive(env, LOCK_SCORE_NOTIFY, 10 * 60, async () => {
    await scoreAndNotify();
    return { ok: true };
  });
}

async function runDailyDigestExclusive(
  env: Env,
): Promise<ExclusiveResult<{ fixtures: number; pushes: number; emails: number }>> {
  return tryRunExclusive(env, LOCK_DAILY_DIGEST, 30 * 60, sendDailyDigest);
}

async function runAiPredictionsExclusive(
  env: Env,
): Promise<ExclusiveResult<Awaited<ReturnType<typeof makeAiPredictions>>>> {
  return tryRunExclusive(env, LOCK_AI_PREDICTIONS, 10 * 60, makeAiPredictions);
}

async function runHighlightsExclusive(
  env: Env,
): Promise<ExclusiveResult<Awaited<ReturnType<typeof fetchHighlights>>>> {
  return tryRunExclusive(env, LOCK_HIGHLIGHTS, 10 * 60, () => {
    if (!env.LIVE_KV) {
      return Promise.resolve({
        ok: false,
        skipped: true,
        reason: "no_key" as const,
        fixtures: 0,
        searches: 0,
        found: 0,
      });
    }
    return fetchHighlights({ kv: env.LIVE_KV });
  });
}

async function runPremiumEmailExclusive(
  env: Env,
): Promise<
  ExclusiveResult<{ fixtures: number; emails: number; whatsapp: number }>
> {
  return tryRunExclusive(env, LOCK_PREMIUM_EMAIL, 30 * 60, sendPremiumEmails);
}

function runIngestExclusive(env: Env): Promise<ExclusiveResult<Awaited<ReturnType<typeof ingestFixtures>>>> {
  return tryRunExclusive(env, LOCK_INGEST, 30 * 60, () =>
    ingestFixtures({
      apiKey: env.API_FOOTBALL_KEY,
      baseUrl: env.API_FOOTBALL_BASE_URL,
      season: env.WC_SEASON ? Number(env.WC_SEASON) : undefined,
    }),
  );
}

function runLiveIngestExclusive(
  env: Env,
): Promise<ExclusiveResult<Awaited<ReturnType<typeof ingestLiveFixtures>>>> {
  return tryRunExclusive(env, LOCK_LIVE_INGEST, 2 * 60, () => {
    if (!env.LIVE_KV) {
      return Promise.resolve({
        ok: false,
        skipped: true,
        reason: "not_configured" as const,
        fixtures: 0,
        events: 0,
        reconciled: 0,
        apiCalls: 0,
        apiCallsToday: 0,
        quotaState: "stopped" as const,
      });
    }
    return ingestLiveFixtures({
      apiKey: env.API_FOOTBALL_KEY,
      baseUrl: env.API_FOOTBALL_BASE_URL,
      season: env.WC_SEASON ? Number(env.WC_SEASON) : undefined,
      kv: env.LIVE_KV,
    });
  });
}

function runPostersExclusive(
  env: Env,
): Promise<ExclusiveResult<Awaited<ReturnType<typeof generatePosters>>>> {
  return tryRunExclusive(env, LOCK_POSTERS, 30 * 60, generatePosters);
}

function runSeedIdentitiesExclusive(env: Env): Promise<ExclusiveResult<{ written: number }>> {
  return tryRunExclusive(env, LOCK_SEED_IDENTITIES, 10 * 60, async () => ({
    written: await seedTeamIdentities(),
  }));
}

function shouldRunScoreAndNotify(now = new Date()): boolean {
  return now.getUTCMinutes() % 2 === 0;
}

async function runLiveMinuteTasks(env: Env): Promise<void> {
  await runLiveIngestExclusive(env).catch((e) => console.error("[live-ingest]", e));
  if (shouldRunScoreAndNotify()) {
    await runScoreAndNotifyExclusive(env);
  }
}

function lockedResponse(result: Extract<ExclusiveResult<unknown>, { acquired: false }>): Response {
  return Response.json(
    { ok: false, error: result.reason },
    { status: result.reason === "locked" ? 409 : 503 },
  );
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
        ctx.waitUntil(runIngestExclusive(env));
        break;
      case "* * * * *":
        // Live poller: update KV snapshots every minute. Notifications keep the old
        // two-minute cadence and run after ingest so fresh events are visible.
        ctx.waitUntil(runLiveMinuteTasks(env));
        break;
      case "*/2 * * * *":
        // Light article nudges keep their previous cadence.
        ctx.waitUntil(Promise.all([generatePreviews(env), generateRecaps(env)]));
        break;
      case "0 1 * * *":
        // 08:00 WIB/ICT — daily match-day digest (push + email).
        ctx.waitUntil(
          runDailyDigestExclusive(env).catch((e) => console.error("[daily-digest]", e)),
        );
        break;
      case "*/15 * * * *":
        // Pre-match premium email, poster prompts and AI predictor picks.
        ctx.waitUntil(
          Promise.all([
            runPremiumEmailExclusive(env).catch((e) => console.error("[premium-email]", e)),
            runPostersExclusive(env).catch((e) => console.error("[posters]", e)),
            runAiPredictionsExclusive(env).catch((e) => console.error("[ai-predictions]", e)),
            runHighlightsExclusive(env).catch((e) => console.error("[highlights]", e)),
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
    if (url.pathname.startsWith(RUN_PATH_PREFIX) && req.method !== "POST") {
      return methodNotAllowed();
    }
    if (url.pathname.startsWith(RUN_PATH_PREFIX) && !(await hasAdminSecret(req, env))) {
      return unauthorized();
    }

    try {
      if (url.pathname === "/__run/ingest") {
        const result = await runIngestExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname === "/__run/live") {
        const result = await runLiveIngestExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname === "/__run/highlights") {
        const result = await runHighlightsExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname === "/__run/ai-predictions") {
        const result = await runAiPredictionsExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname === "/__run/daily-digest") {
        const result = await runDailyDigestExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname === "/__run/notify") {
        const result = await runScoreAndNotifyExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname === "/__run/premium-email") {
        const result = await runPremiumEmailExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname === "/__run/posters") {
        const result = await runPostersExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname === "/__run/seed-identities") {
        const result = await runSeedIdentitiesExclusive(env);
        return result.acquired ? Response.json(result.value) : lockedResponse(result);
      }
      if (url.pathname.startsWith(RUN_PATH_PREFIX)) {
        return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      }
    } catch (error) {
      console.error(`[manual-run] ${url.pathname} failed`, error);
      return Response.json(
        { ok: false, error: "internal", message: sanitizedErrorMessage(error) },
        { status: 500 },
      );
    }
    return new Response("skorly-jobs ok", { status: 200 });
  },
};
