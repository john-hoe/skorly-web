/** Worker bindings + secrets. Mirrors wrangler.toml [vars] and `secret put`. */
export interface Env {
  // secrets
  DATABASE_URL: string;
  API_FOOTBALL_KEY: string;
  DEEPSEEK_API_KEY: string;
  OPENROUTER_API_KEY: string;
  QWEN_API_KEY?: string;
  GLM_API_KEY?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  // vars
  API_FOOTBALL_BASE_URL: string;
  DEEPSEEK_BASE_URL: string;
  OPENROUTER_BASE_URL: string;
}

/** Copy Worker env into process.env so shared packages (which read process.env) work. */
export function hydrateProcessEnv(env: Env): void {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  if (!g.process) g.process = { env: {} };
  if (!g.process.env) g.process.env = {};
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === "string") g.process.env[k] = v;
  }
}
