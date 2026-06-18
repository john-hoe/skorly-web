import OpenAI from "openai";

/**
 * Provider-agnostic LLM client. All providers we use are OpenAI-compatible:
 *   - DeepSeek V4 Pro      -> generation (primary)
 *   - OpenRouter           -> judge (heterogeneous model) + fallback router
 *   - Qwen (Alibaba)       -> SEA-language fallback (more native id/vi)
 *   - GLM (Zhipu)          -> SEA-language second fallback
 *
 * Keys live in env (see env.example). Nothing here makes a network call until
 * `complete()` is invoked with a configured provider.
 */

export type ProviderName =
  | "deepseek"
  | "qwen"
  | "glm"
  | "minimax"
  | "mimo"
  | "openrouter";

export type LlmRole = "generate" | "critique" | "judge" | "fallback";

/**
 * Ordered fallback chain per primary provider. GLM (judge/review) is known to
 * rate-limit, so it falls back to MiMo, then to the most stable deepseek-v4-pro.
 * Everything ultimately ends at deepseek.
 */
const FALLBACK_CHAIN: Record<ProviderName, ProviderName[]> = {
  glm: ["mimo", "deepseek"],
  qwen: ["deepseek"],
  minimax: ["deepseek"],
  mimo: ["deepseek"],
  openrouter: ["deepseek"],
  deepseek: [],
};

interface ProviderConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
}

function providers(): Record<ProviderName, ProviderConfig> {
  return {
    // Latest flagship models (verified June 2026).
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY,
      baseUrl:
        process.env.QWEN_BASE_URL ??
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: process.env.QWEN_MODEL ?? "qwen3.7-max",
    },
    glm: {
      apiKey: process.env.GLM_API_KEY,
      baseUrl: process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4",
      model: process.env.GLM_MODEL ?? "glm-5.1",
    },
    minimax: {
      apiKey: process.env.MINIMAX_API_KEY,
      baseUrl: process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/v1",
      // MiniMax-M3 is a thinking model: callers that parse JSON must strip the
      // leading <think>…</think> block (see extractFactSheet).
      model: process.env.MINIMAX_MODEL ?? "MiniMax-M3",
    },
    mimo: {
      apiKey: process.env.MIMO_API_KEY,
      baseUrl: process.env.MIMO_BASE_URL ?? "https://api.xiaomimimo.com/v1",
      model: process.env.MIMO_MODEL ?? "mimo-v2.5-pro",
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_JUDGE_MODEL ?? "openai/gpt-4o-mini",
    },
  };
}

/** Which provider serves each role. The judge/review provider (GLM) MUST differ
 *  from the generator (DeepSeek) to avoid self-grading bias. OpenRouter is no
 *  longer used (unfunded). */
const ROLE_PROVIDER: Record<LlmRole, ProviderName> = {
  generate: "deepseek", // deepseek-v4-pro
  critique: "qwen", // qwen3.7-max — native-language rewrite
  judge: "glm", // glm-5.1 — judge + review (heterogeneous)
  fallback: "qwen", // back-translation
};

const DEFAULT_REQUEST_TIMEOUT_MS = 90_000;
const MIN_PROVIDER_TIMEOUT_MS = 1_000;
const MAX_FALLBACK_RESERVE_MS = 20_000;

function requestTimeoutMs(): number {
  const raw = Number(process.env.LLM_REQUEST_TIMEOUT_MS);
  return Number.isFinite(raw) && raw >= 5_000 ? Math.floor(raw) : DEFAULT_REQUEST_TIMEOUT_MS;
}

function remainingDeadlineMs(deadlineMs: number): number {
  return Math.max(0, deadlineMs - Date.now());
}

function providerBudgetMs(totalDeadlineMs: number, providerCount: number): number {
  const remaining = remainingDeadlineMs(totalDeadlineMs);
  if (providerCount <= 1 || remaining <= MIN_PROVIDER_TIMEOUT_MS) return remaining;

  const fairSlice = Math.floor(remaining / providerCount);
  const reservePerFallback = Math.min(
    MAX_FALLBACK_RESERVE_MS,
    Math.max(MIN_PROVIDER_TIMEOUT_MS, fairSlice),
  );
  const reserve = reservePerFallback * (providerCount - 1);
  return Math.max(MIN_PROVIDER_TIMEOUT_MS, remaining - reserve);
}

export interface CompleteParams {
  role?: LlmRole;
  provider?: ProviderName;
  /** Override the provider's default model (e.g. a fast flash model). */
  model?: string;
  /**
   * Override the default fallback chain for this call only. The primary
   * (provider/role) is tried first, then each provider listed here in order.
   * Used e.g. by fact extraction: glm -> minimax(M3) -> deepseek.
   */
  fallback?: ProviderName[];
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export interface CompleteResult {
  text: string;
  provider: ProviderName;
  model: string;
}

/** One provider attempt bounded by its provider deadline. */
async function callProvider(
  name: ProviderName,
  cfg: ProviderConfig,
  params: CompleteParams,
  providerDeadlineMs: number,
): Promise<CompleteResult> {
  // Keep retries under one provider budget. SDK retries stay disabled so a
  // timeout cannot multiply across SDK retries, our retry loop, and fallbacks.
  const model = params.model ?? cfg.model;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const remaining = remainingDeadlineMs(providerDeadlineMs);
    if (remaining <= 0) {
      throw lastErr ?? new Error(`LLM provider "${name}" timed out before request`);
    }
    const client = new OpenAI({
      apiKey: cfg.apiKey!,
      baseURL: cfg.baseUrl,
      maxRetries: 0,
      timeout: remaining,
    });
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: params.temperature ?? 0.7,
        // Generous budget: the flagship models (deepseek-v4-pro, glm-5.1,
        // qwen3.7-max) are thinking models — reasoning tokens are counted
        // separately, so a small cap can leave `content` empty.
        max_tokens: params.maxTokens ?? 4000,
        response_format: params.json ? { type: "json_object" } : undefined,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      });
      const text = completion.choices[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("empty content from provider");
      return { text, provider: name, model };
    } catch (e) {
      lastErr = e;
      const sleepMs = Math.min(1000 * (attempt + 1), remainingDeadlineMs(providerDeadlineMs));
      if (attempt < 2 && sleepMs > 0) {
        await new Promise((r) => setTimeout(r, sleepMs));
      }
    }
  }
  throw lastErr;
}

export async function complete(params: CompleteParams): Promise<CompleteResult> {
  const all = providers();
  const primary: ProviderName =
    params.provider ?? ROLE_PROVIDER[params.role ?? "generate"];

  // Try the role's primary provider, then walk its fallback chain
  // (e.g. glm -> mimo -> deepseek) until one succeeds. A per-call `fallback`
  // overrides the default chain for that provider.
  const chain: ProviderName[] = [
    primary,
    ...(params.fallback ?? FALLBACK_CHAIN[primary] ?? ["deepseek"]),
  ];

  let lastErr: unknown;
  const totalDeadlineMs = Date.now() + requestTimeoutMs();
  for (const [index, name] of chain.entries()) {
    if (remainingDeadlineMs(totalDeadlineMs) <= 0) break;
    const cfg = all[name];
    if (!cfg.apiKey) {
      lastErr = new Error(`LLM provider "${name}" missing API key`);
      continue;
    }
    try {
      const providerCount = chain
        .slice(index)
        .filter((providerName) => Boolean(all[providerName]?.apiKey)).length;
      const budgetMs = providerBudgetMs(totalDeadlineMs, providerCount);
      if (budgetMs <= 0) break;
      return await callProvider(name, cfg, params, Date.now() + budgetMs);
    } catch (e) {
      lastErr = e;
      // fall through to the next provider in the chain
    }
  }
  throw lastErr;
}
