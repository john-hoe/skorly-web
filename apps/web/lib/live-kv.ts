import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { LiveAllSnapshot, LiveFixtureSnapshot } from "@skorly/types";

type LiveKvNamespace = {
  get(key: string): Promise<string | null>;
};

declare global {
  interface CloudflareEnv {
    LIVE_KV?: LiveKvNamespace;
  }
}

const LIVE_ALL_KEY = "live:all";
const LIVE_FIXTURE_PREFIX = "live:fixture:";

export const LIVE_CACHE_HEADERS = {
  "Cache-Control": "s-maxage=10, stale-while-revalidate=30",
};

async function liveKv(): Promise<LiveKvNamespace | null> {
  try {
    const context = await getCloudflareContext({ async: true });
    return context.env.LIVE_KV ?? null;
  } catch {
    return null;
  }
}

async function readJson<T>(key: string): Promise<T | null> {
  const kv = await liveKv();
  if (!kv) return null;
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function liveKvConfiguredForRequest(): Promise<boolean> {
  return liveKv().then(Boolean);
}

export function getLiveAllSnapshot(): Promise<LiveAllSnapshot | null> {
  return readJson<LiveAllSnapshot>(LIVE_ALL_KEY);
}

export function getLiveFixtureSnapshot(
  fixtureId: number,
): Promise<LiveFixtureSnapshot | null> {
  return readJson<LiveFixtureSnapshot>(`${LIVE_FIXTURE_PREFIX}${fixtureId}`);
}
