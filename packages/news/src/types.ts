export type SignalSource =
  | "socialdata"
  | "rss"
  | "api_football"
  | "dongqiudi"
  | "zhibo8";

export interface SignalEntities {
  teams: string[];
  players: string[];
}

/**
 * A raw signal/lead. We deliberately store only lead-level metadata
 * (headline/url/entities), NEVER the full third-party article body.
 */
export interface RawSignal {
  source: SignalSource;
  /** Canonical URL, used for dedup (unique) + attribution audit. */
  url: string;
  /** Tweet id / RSS guid — for incremental polling. */
  externalId?: string;
  author?: string;
  /** Headline or tweet snippet (lead only). */
  title: string;
  lang?: string;
  entities?: SignalEntities;
  hasMedia?: boolean;
  /** Embeddable URL when the signal carries official media. */
  embedUrl?: string;
  publishedAt?: Date;
  /** True if from a tracked/trusted source (e.g. a followed journalist), not a raw keyword search. */
  fromTracked?: boolean;
}

export interface FetchOpts {
  /** Only return signals newer than this (best-effort per source). */
  since?: Date;
  limit?: number;
}

export interface SourceAdapter {
  readonly source: SignalSource;
  fetch(opts?: FetchOpts): Promise<RawSignal[]>;
}
