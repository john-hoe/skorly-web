export interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

export interface TavilySearch {
  answer: string | null;
  results: TavilyResult[];
}

/** Clean a noisy topic title (emojis, urls) into a focused search query. */
export function toQuery(title: string): string {
  const cleaned = title
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@]\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 12)
    .join(" ");
  return /world cup|piala dunia|2026/i.test(cleaned)
    ? cleaned
    : `${cleaned} 2026 World Cup`;
}

/**
 * (Lever C) Web-search grounding via Tavily. Returns a synthesized answer plus
 * source results so the fact extractor has REAL current facts (squads, numbers,
 * transfers) instead of the writer guessing from stale memory.
 */
export async function tavilySearch(
  query: string,
  opts: { apiKey: string; maxResults?: number; fetchImpl?: typeof fetch }
): Promise<TavilySearch> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: opts.apiKey,
      query,
      max_results: opts.maxResults ?? 5,
      include_answer: true,
      search_depth: "advanced",
    }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    answer?: string;
    results?: { title?: string; url?: string; content?: string }[];
  };
  return {
    answer: data.answer ?? null,
    results: (data.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      content: (r.content ?? "").slice(0, 1200),
    })),
  };
}
