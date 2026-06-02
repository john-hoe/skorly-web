import type { RawSignal } from "./types";

/** Strip a fetched HTML page down to its main readable text. */
function extractMainText(html: string): string {
  let s = html;
  // Drop non-content regions entirely.
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  s = s.replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  // Prefer <article> body if present.
  const article = s.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? s;

  // Collect paragraph + heading text.
  const chunks = [...article.matchAll(/<(p|h1|h2|h3|li)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) =>
      (m[2] ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((t) => t.length > 30); // drop nav/boilerplate fragments

  return chunks.join("\n").slice(0, 4000); // cap for the LLM
}

const SKIP_HOSTS = ["x.com", "twitter.com", "youtube.com", "youtu.be", "instagram.com"];

function isFetchable(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false; // skip urn: (api-football) etc.
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return !SKIP_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

/**
 * (Lever A) Fetch the full article text behind RSS/news leads so the writer has
 * REAL material and doesn't invent specifics. We read the page and extract
 * facts ourselves — we never republish the source text verbatim.
 * Tweets/social are skipped (their snippet is the lead; embed carries the rest).
 */
export async function fetchSourceText(
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8000
): Promise<string | null> {
  if (!isFetchable(url)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetchImpl(url, {
      headers: { "User-Agent": "SkorlyBot/1.0 (+https://skorly.cc)" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("text/html")) return null;
    const html = await res.text();
    const text = extractMainText(html);
    return text.length > 80 ? text : null;
  } catch {
    return null;
  }
}

export interface EnrichedLead {
  text: string;
  url: string;
  source: string;
}

/**
 * Build enriched leads for a topic's signals: where possible, replace the thin
 * headline with the fetched full article text (capped). Bounded concurrency.
 */
export async function enrichLeadsWithSource(
  signals: { title: string; url: string; source: string }[],
  fetchImpl: typeof fetch = fetch
): Promise<EnrichedLead[]> {
  const out: EnrichedLead[] = [];
  for (const s of signals) {
    const full = await fetchSourceText(s.url, fetchImpl);
    out.push({
      url: s.url,
      source: s.source,
      text: full ? `${s.title}\n\n${full}` : s.title,
    });
  }
  return out;
}

export type { RawSignal };
