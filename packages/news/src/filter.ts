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
];

const NOISE_RE = new RegExp(
  NOISE_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i"
);

/** Looks like an ad/spam tweet (many hashtags, link-only, etc.). */
function looksSpammy(text: string): boolean {
  if (NOISE_RE.test(text)) return true;
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
    if (looksSpammy(s.title)) return false;

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
