/**
 * Dev convenience: read the user's key vault (~/.env/apikey, free-form
 * "Name = value" lines) and emit a standard .env at the repo root + a
 * NEXT_PUBLIC-only apps/web/.env.local. Secrets are NOT stored in this script;
 * generated files are gitignored.
 *
 * Run: node scripts/sync-env.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const VAULT = join(homedir(), "workspace/.env/apikey");
const ROOT = join(import.meta.dirname, "..");

// Confirmed project facts (non-secret).
const SUPABASE_REF = "majrlaxktengachwrskk";
const SUPABASE_REGION = "ap-northeast-2";
const POOLER_HOST = `aws-1-${SUPABASE_REGION}.pooler.supabase.com`;
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hanJsYXhrdGVuZ2FjaHdyc2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTYxNzMsImV4cCI6MjA5NTU5MjE3M30.rpdEHzJ0bLfYcdZekWeIVE20vRRpKQ1JjB0dHaKyjhE";

function parseVault() {
  const text = readFileSync(VAULT, "utf8");
  const map = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const idx = t.indexOf("=");
    const key = t.slice(0, idx).trim().toLowerCase();
    let val = t.slice(idx + 1).trim().replace(/^"|"$/g, "");
    map[key] = val;
  }
  return map;
}

const v = parseVault();
const get = (needle) => {
  const k = Object.keys(v).find((key) => key.includes(needle));
  return k ? v[k] : "";
};

const dbPassword = get("supabase database password");
const databaseUrl = dbPassword
  ? `postgresql://postgres.${SUPABASE_REF}:${encodeURIComponent(dbPassword)}@${POOLER_HOST}:6543/postgres`
  : "";

const env = {
  // DB
  DATABASE_URL: databaseUrl,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: get("service_role"),
  // Cache
  UPSTASH_REDIS_REST_URL: get("upstash_redis_rest_url"),
  UPSTASH_REDIS_REST_TOKEN: get("upstash_redis_rest_token"),
  // Sports data
  API_FOOTBALL_KEY: get("api-football"),
  API_FOOTBALL_BASE_URL: "https://v3.football.api-sports.io",
  WC_SEASON: "2026",
  // LLM providers
  DEEPSEEK_API_KEY: get("deepseekv4"),
  DEEPSEEK_BASE_URL: "https://api.deepseek.com",
  DEEPSEEK_MODEL: "deepseek-chat",
  OPENROUTER_API_KEY: get("openrouter"),
  OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
  OPENROUTER_JUDGE_MODEL: "openai/gpt-4o-mini",
  QWEN_API_KEY: get("bailian"),
  QWEN_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  QWEN_MODEL: "qwen-plus",
  GLM_API_KEY: get("z.ai"),
  GLM_BASE_URL: "https://open.bigmodel.cn/api/paas/v4",
  GLM_MODEL: "glm-4-plus",
  // Email
  RESEND_API_KEY: get("resend"),
  RESEND_FROM: "Skorly <noreply@skorly.cc>",
  // Cloudflare (deploy)
  CLOUDFLARE_ACCOUNT_ID: get("cloudflare account id"),
  CLOUDFLARE_API_TOKEN: get("cloudflare deploy token"),
  // Admin jobs bridge
  JOBS_ADMIN_SECRET: get("jobs admin secret") || get("jobs_admin_secret"),
  JOBS_ADMIN_URL: get("jobs admin url") || get("jobs_admin_url"),
  // Public site
  NEXT_PUBLIC_SITE_URL: "https://skorly.cc",
  NEXT_PUBLIC_DEFAULT_LOCALE: "id",
  NEXT_PUBLIC_GA_ID: "G-98VPG3BHXS",
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
};

const toEnvFile = (obj) =>
  Object.entries(obj)
    .map(([k, val]) => `${k}=${JSON.stringify(val ?? "")}`)
    .join("\n") + "\n";

writeFileSync(join(ROOT, ".env"), toEnvFile(env));

const webPublic = Object.fromEntries(
  Object.entries(env).filter(([k]) => k.startsWith("NEXT_PUBLIC_"))
);
writeFileSync(join(ROOT, "apps/web/.env.local"), toEnvFile({ ...env }));

const missing = Object.entries(env)
  .filter(([, val]) => !val)
  .map(([k]) => k);

console.log("Wrote .env and apps/web/.env.local");
console.log("Vars set:", Object.keys(env).length - missing.length, "/", Object.keys(env).length);
if (missing.length) console.log("MISSING (empty):", missing.join(", "));
