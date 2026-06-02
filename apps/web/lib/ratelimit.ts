/**
 * Tiny fixed-window rate limiter backed by Upstash Redis REST.
 * Edge/Workers-safe (plain fetch, no SDK). Fails OPEN when Upstash is not
 * configured or unreachable, so a Redis outage never locks users out.
 */
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
}

/**
 * @param key      unique bucket key (e.g. `auth:signup:1.2.3.4`)
 * @param limit    max requests allowed per window
 * @param windowSec window size in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (!URL || !TOKEN) return { success: true, remaining: limit, limit };

  const redisKey = `rl:${key}`;
  try {
    // INCR then set expiry on first hit — pipelined in one round-trip.
    const res = await fetch(`${URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return { success: true, remaining: limit, limit };
    const out = (await res.json()) as Array<{ result: number }>;
    const count = out?.[0]?.result ?? 0;
    const remaining = Math.max(0, limit - count);
    return { success: count <= limit, remaining, limit };
  } catch {
    return { success: true, remaining: limit, limit };
  }
}

/** Best-effort client IP from standard proxy headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}
