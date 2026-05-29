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

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  _client = postgres(url, { prepare: false });
  _db = drizzle(_client, { schema });
  return _db;
}

export { schema };
export type Database = ReturnType<typeof getDb>;
