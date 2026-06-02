import type { FetchOpts, RawSignal, SourceAdapter } from "../types";

export interface RssOptions {
  /** Feed URLs (ESPN FC, BBC Sport, Google News query RSS, club feeds). */
  feeds: string[];
  lang?: string;
  fetchImpl?: typeof fetch;
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]!) : undefined;
}

/**
 * Minimal RSS/Atom item extractor. Zero deps, Worker-friendly. Targets
 * well-formed feeds (ESPN/BBC/Google News). Pulls title/link/pubDate only —
 * we never store full content.
 */
export class RssAdapter implements SourceAdapter {
  readonly source = "rss" as const;
  private readonly feeds: string[];
  private readonly lang?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: RssOptions) {
    this.feeds = opts.feeds;
    this.lang = opts.lang;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async parseFeed(xml: string): Promise<RawSignal[]> {
    const out: RawSignal[] = [];
    // RSS <item> or Atom <entry>
    const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
    for (const block of blocks) {
      const title = tag(block, "title");
      // RSS uses <link>url</link>; Atom uses <link href="url"/>
      let link = tag(block, "link");
      if (!link) {
        const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
        link = m?.[1];
      }
      if (!title || !link) continue;
      const dateStr = tag(block, "pubDate") ?? tag(block, "updated") ?? tag(block, "published");
      const guid = tag(block, "guid") ?? tag(block, "id") ?? link;
      out.push({
        source: this.source,
        url: link,
        externalId: guid,
        title,
        lang: this.lang,
        publishedAt: dateStr ? new Date(dateStr) : undefined,
      });
    }
    return out;
  }

  async fetch(opts: FetchOpts = {}): Promise<RawSignal[]> {
    const all: RawSignal[] = [];
    for (const feed of this.feeds) {
      try {
        const res = await this.fetchImpl(feed, {
          headers: { "User-Agent": "SkorlyBot/1.0 (+https://skorly.cc)" },
        });
        if (!res.ok) continue;
        const xml = await res.text();
        let items = await this.parseFeed(xml);
        if (opts.since) {
          items = items.filter((i) => !i.publishedAt || i.publishedAt >= opts.since!);
        }
        all.push(...items);
      } catch {
        continue;
      }
    }
    return all;
  }
}
