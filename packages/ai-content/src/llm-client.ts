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

export type ProviderName = "deepseek" | "openrouter" | "qwen" | "glm";

export type LlmRole = "generate" | "critique" | "judge" | "fallback";

interface ProviderConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
}

function providers(): Record<ProviderName, ProviderConfig> {
  return {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_JUDGE_MODEL ?? "google/gemini-2.0-flash-001",
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY,
      baseUrl:
        process.env.QWEN_BASE_URL ??
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: process.env.QWEN_MODEL ?? "qwen-plus",
    },
    glm: {
      apiKey: process.env.GLM_API_KEY,
      baseUrl: process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4",
      model: process.env.GLM_MODEL ?? "glm-4-plus",
    },
  };
}

/** Which provider serves each role. Generation defaults to DeepSeek; the
 *  judge MUST differ from the generator to avoid self-grading bias. */
const ROLE_PROVIDER: Record<LlmRole, ProviderName> = {
  generate: "deepseek",
  critique: "qwen",
  judge: "openrouter",
  fallback: "qwen",
};

export interface CompleteParams {
  role?: LlmRole;
  provider?: ProviderName;
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

export async function complete(params: CompleteParams): Promise<CompleteResult> {
  const name: ProviderName =
    params.provider ?? ROLE_PROVIDER[params.role ?? "generate"];
  const cfg = providers()[name];
  if (!cfg.apiKey) {
    throw new Error(`LLM provider "${name}" missing API key`);
  }

  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl });
  const completion = await client.chat.completions.create({
    model: cfg.model,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.maxTokens ?? 1500,
    response_format: params.json ? { type: "json_object" } : undefined,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });

  return {
    text: completion.choices[0]?.message?.content ?? "",
    provider: name,
    model: cfg.model,
  };
}
