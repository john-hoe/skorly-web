import type { FetchOpts, RawSignal, SourceAdapter } from "../types";

export interface SocialDataOptions {
  apiKey: string;
  /** Twitter handles to track (without @). */
  accounts?: string[];
  /** Keyword queries (Twitter search syntax), e.g. "World Cup 2026". */
  keywords?: string[];
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface SdTweet {
  id_str?: string;
  id?: number;
  full_text?: string;
  text?: string;
  tweet_created_at?: string;
  created_at?: string;
  lang?: string;
  user?: { screen_name?: string };
  entities?: { media?: unknown[] };
  extended_entities?: { media?: unknown[] };
}

interface SdResponse {
  tweets?: SdTweet[];
  next_cursor?: string;
}

/**
 * SocialData.tools adapter — our real-time X (Twitter) signal source.
 * Builds Twitter search queries from tracked accounts + keywords. We only keep
 * lead metadata (tweet text snippet + url); never republish tweets verbatim.
 */
export class SocialDataAdapter implements SourceAdapter {
  readonly source = "socialdata" as const;
  private readonly apiKey: string;
  private readonly accounts: string[];
  private readonly keywords: string[];
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: SocialDataOptions) {
    this.apiKey = opts.apiKey;
    this.accounts = opts.accounts ?? [];
    this.keywords = opts.keywords ?? [];
    this.baseUrl = opts.baseUrl ?? "https://api.socialdata.tools";
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  /** Build the set of search queries to run this cycle (tagged tracked vs keyword). */
  private queries(): { query: string; tracked: boolean }[] {
    const qs: { query: string; tracked: boolean }[] = [];
    // One combined OR query for tracked accounts (cheaper than one each).
    if (this.accounts.length) {
      const ors = this.accounts.map((a) => `from:${a}`).join(" OR ");
      qs.push({ query: `(${ors}) -filter:replies`, tracked: true });
    }
    for (const kw of this.keywords) qs.push({ query: kw, tracked: false });
    return qs;
  }

  private async search(query: string): Promise<SdTweet[]> {
    const url = new URL(`${this.baseUrl}/twitter/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("type", "Latest");
    const res = await this.fetchImpl(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`SocialData ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as SdResponse;
    return data.tweets ?? [];
  }

  async fetch(opts: FetchOpts = {}): Promise<RawSignal[]> {
    const out: RawSignal[] = [];
    const seen = new Set<string>();
    for (const { query, tracked } of this.queries()) {
      let tweets: SdTweet[] = [];
      try {
        tweets = await this.search(query);
      } catch {
        continue; // one query failing shouldn't abort the whole cycle
      }
      for (const t of tweets) {
        const id = t.id_str ?? (t.id != null ? String(t.id) : undefined);
        const handle = t.user?.screen_name;
        if (!id || !handle) continue;
        const url = `https://x.com/${handle}/status/${id}`;
        if (seen.has(url)) continue;
        seen.add(url);

        const createdRaw = t.tweet_created_at ?? t.created_at;
        const publishedAt = createdRaw ? new Date(createdRaw) : undefined;
        if (opts.since && publishedAt && publishedAt < opts.since) continue;

        const media =
          (t.extended_entities?.media?.length ?? 0) > 0 ||
          (t.entities?.media?.length ?? 0) > 0;

        out.push({
          source: this.source,
          url,
          externalId: id,
          author: handle,
          title: (t.full_text ?? t.text ?? "").slice(0, 280),
          lang: t.lang,
          hasMedia: media,
          embedUrl: url, // the tweet itself is the embeddable unit
          publishedAt,
          fromTracked: tracked,
        });
      }
    }
    return out;
  }
}
