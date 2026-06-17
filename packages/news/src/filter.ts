import type { RawSignal } from "./types";

/** Spam / promo / crypto-airdrop / betting noise that keyword search drags in. */
const NOISE_TERMS = [
  "bounty",
  "airdrop",
  "giveaway",
  "giving away",
  "free money",
  "crypto",
  "token",
  "presale",
  "whitelist",
  "nft",
  "casino",
  "betting",
  "bet now",
  "odds boost",
  "promo code",
  "sign up bonus",
  "referral",
  "follow & retweet",
  "follow and retweet",
  "rt to win",
  "tag a friend",
  "discount",
  "shop now",
  "use code",
  "watch live stream",
  "live stream",
  "live streaming",
  "streaming link",
  "free stream",
  "match stream",
  "link 1",
  "link 2",
];

const NOISE_RE = new RegExp(
  NOISE_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i"
);

/** Looks like an ad/spam tweet (many hashtags, link-only, etc.). */
export function isSpammySignalText(text: string): boolean {
  if (NOISE_RE.test(text)) return true;
  const urls = (text.match(/https?:\/\/\S+/gi) ?? []).length;
  if (urls >= 2 && /\b(watch|stream|live)\b/i.test(text)) return true;
  const hashtags = (text.match(/#/g) ?? []).length;
  if (hashtags >= 5) return true; // hashtag spam
  const cashtags = (text.match(/\$[A-Z]{2,}/g) ?? []).length;
  if (cashtags >= 1) return true; // crypto cashtags
  return false;
}

export interface FilterOptions {
  /** Drop keyword-sourced signals that matched no known team. Default true. */
  requireEntityForKeyword?: boolean;
}

/**
 * Filter raw signals before clustering:
 * - drop spam/promo/crypto/betting noise (esp. from keyword search)
 * - drop keyword/RSS signals with no recognized football entity
 * Account-sourced tweets (tracked journalists) are trusted and kept even
 * without a matched entity, since the account itself is the quality signal.
 */
export function filterSignals(
  signals: RawSignal[],
  opts: FilterOptions = {}
): RawSignal[] {
  const requireEntity = opts.requireEntityForKeyword ?? true;
  return signals.filter((s) => {
    if (isSpammySignalText(s.title)) return false;

    const hasTeam = (s.entities?.teams.length ?? 0) > 0;
    // api_football signals are structured facts → always keep.
    if (s.source === "api_football") return true;
    // Tracked journalists are themselves the quality signal → keep.
    if (s.fromTracked) return true;

    // Untracked keyword/RSS leads must mention a known team to be worth a topic.
    if (requireEntity && !hasTeam) return false;
    return true;
  });
}

/** Per-source trust weight, folded into heat scoring. */
export function sourceWeight(source: RawSignal["source"]): number {
  switch (source) {
    case "api_football":
      return 3; // structured facts
    case "socialdata":
      return 2; // tracked journalists
    case "rss":
      return 2; // established media
    case "dongqiudi":
    case "zhibo8":
      return 1; // topic radar only
    default:
      return 1;
  }
}

export type TopicPublishabilityRoute = "write" | "brief_only" | "reject";

export interface TopicPublishabilitySignal {
  source: RawSignal["source"] | string;
  title: string;
  url?: string | null;
  hasMedia?: boolean | null;
}

export interface TopicPublishabilityInput {
  title: string;
  heat: number;
  signalCount: number;
  signals: TopicPublishabilitySignal[];
}

export interface TopicPublishability {
  score: number;
  route: TopicPublishabilityRoute;
  trustedSourceCount: number;
  distinctSourceCount: number;
  usableSignalCount: number;
  reasons: string[];
}

const TRUSTED_TOPIC_SOURCES = new Set(["api_football", "rss", "socialdata", "tavily"]);

function hasResultShape(text: string): boolean {
  return /\b\d+\s*[-:]\s*\d+\b/.test(text) || /\b(beat|defeat|won|full-?time|final whistle|hat-?trick)\b/i.test(text);
}

function looksLikeThinHighlight(text: string): boolean {
  return /\b(highlights?|clip|video|watch|reaction|goal\s+video|assist\s+video)\b/i.test(text);
}

function looksLikePredictionOrOdds(text: string): boolean {
  return /\b(prediction|predict|odds|betting|bet now|lineups? prediction|tips?)\b/i.test(text);
}

function looksLikeLowTrustTransferRumour(text: string): boolean {
  return /\b(transfer|signs?|signing|joins?|loan|fee|clause|agent|rumou?r|linked with)\b/i.test(text);
}

/**
 * Lightweight pre-generation routing. It does not decide truth; it decides
 * whether the topic is likely to contain enough verifiable material to spend
 * generation/fact-check budget on today.
 */
export function scoreTopicPublishability(input: TopicPublishabilityInput): TopicPublishability {
  const titleText = input.title.trim();
  const allText = [titleText, ...input.signals.map((s) => s.title)].join(" ");
  const usableSignals = input.signals.filter((s) => !isSpammySignalText(s.title));
  const trustedSourceCount = usableSignals.filter((s) => TRUSTED_TOPIC_SOURCES.has(s.source)).length;
  const distinctSourceCount = new Set(usableSignals.map((s) => s.source)).size;
  const reasons: string[] = [];
  let score = 20;

  if (trustedSourceCount > 0) score += 25;
  else reasons.push("no trusted source");

  if (usableSignals.length >= 2) score += 20;
  else reasons.push("single usable signal");

  if (distinctSourceCount >= 2) score += 15;
  if (hasResultShape(allText)) score += 15;
  if (titleText.split(/\s+/).filter(Boolean).length >= 6) score += 5;
  if (input.heat >= 10) score += 5;

  if (input.signals.some((s) => isSpammySignalText(s.title)) || isSpammySignalText(titleText)) {
    score -= 60;
    reasons.push("spam/live-stream signal");
  }
  if (looksLikePredictionOrOdds(allText)) {
    score -= 35;
    reasons.push("prediction/odds topic");
  }
  if (looksLikeThinHighlight(allText) && usableSignals.length < 2) {
    score -= 25;
    reasons.push("highlight-only signal");
  }
  if (
    usableSignals.length < 2 &&
    trustedSourceCount === 0 &&
    looksLikeLowTrustTransferRumour(allText)
  ) {
    score -= 25;
    reasons.push("single low-trust transfer rumour");
  }

  score = Math.max(0, Math.min(100, score));
  const route: TopicPublishabilityRoute =
    reasons.includes("spam/live-stream signal") || reasons.includes("prediction/odds topic")
      ? "reject"
      : score >= 60 && trustedSourceCount > 0 && usableSignals.length >= 2
        ? "write"
        : score >= 45 && trustedSourceCount > 0
          ? "brief_only"
          : "reject";

  return {
    score,
    route,
    trustedSourceCount,
    distinctSourceCount,
    usableSignalCount: usableSignals.length,
    reasons,
  };
}
