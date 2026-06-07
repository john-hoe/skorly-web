import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Drizzle client over postgres.js, talking to Supabase.
 *
 * IMPORTANT: use the Supabase connection POOLER string (Supavisor, port 6543,
 * transaction mode) so it works from serverless/edge runtimes. Transaction
 * mode does not support prepared statements, hence `prepare: false`.
 *
 * DATABASE_URL is read lazily so importing this package without env configured
 * (e.g. during type-checking) does not throw.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;
let cacheEnabled = true;

export function setDbClientCacheEnabled(enabled: boolean): void {
  cacheEnabled = enabled;
  if (!enabled) {
    _db = null;
    _client = null;
  }
}

export function getDb() {
  if (cacheEnabled && _db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // `idle_timeout` closes idle connections so short-lived processes (e.g.
  // `next build` static generation, scripts) can exit instead of hanging on an
  // open pool. `max` caps concurrent connections against the Supavisor pooler
  // (kept small so parallel SSG workers can't exhaust the transaction pool).
  // `connect_timeout` (seconds) and `statement_timeout` (ms) make queries
  // fail fast instead of hanging forever when the pooler is saturated.
  // Note: `statement_timeout` is sent via Postgres startup options and is
  // generally honored by the Supavisor transaction pooler (port 6543).
  _client = postgres(url, {
    prepare: false,
    idle_timeout: 20,
    max: 4,
    connect_timeout: 15,
    connection: { statement_timeout: 30000 },
  });
  const db = drizzle(_client, { schema });
  if (cacheEnabled) {
    _db = db;
  }
  return db;
}

export { schema };
export type Database = ReturnType<typeof getDb>;
