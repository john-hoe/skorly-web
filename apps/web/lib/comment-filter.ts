/**
 * UGC guardrail for football comments — the #1 risk vectors are gambling spam
 * and pirate-stream link drops. We reject (not silently hide) so the user gets
 * feedback, and we never let raw links through. Tuned for id/vi/en/zh/th audiences.
 */

// Any URL / bare domain / obfuscated dot ("dot", "(.)", "[.]").
const URL_RE =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\s*(?:\.|\(\.\)|\[\.\]|\sdot\s)\s*(?:com|net|org|xyz|vip|club|live|tv|io|cc|me|info|win|bet|app|link|to|gg)\b)/i;

// Gambling / betting (id: judi, taruhan, togel, slot gacor; vi: cá cược, nhà cái;
// en: bet, casino, odds, parlay; th: แทงบอล, เว็บพนัน, ราคาบอล) + common spam brands.
const GAMBLING_RE =
  /\b(judi|togel|slot\s*(gacor|online)?|maxwin|gacor|taruhan|bandar|sbobet|parlay|mix\s*parlay|casino|kasino|cas[ií]no|bet(ting|365)?|sportsbook|sportsbet|odds|bookie|cá\s*cược|nhà\s*cái|đặt\s*cược|gambl(e|ing)|wd\s*(cepat|lancar)|deposit\s*pulsa|rtp\s*(live|slot))\b|แทงบอล|เว็บพนัน|ราคาบอล|ทีเด็ดบอล|พนันบอล|เจ้ามือ|อัตราต่อรอง|เดิมพัน/i;

// Pirate streaming bait paired with a link is the real risk; words alone are ok
// in legit context, so we only block when combined with a URL (handled below).
const PIRACY_RE =
  /\b(nonton\s*(gratis|live)?|streaming\s*(gratis|bola)?|live\s*streaming|link\s*(nonton|live|streaming)|xem\s*(trực\s*tiếp|bóng\s*đá)|full\s*match\s*free)\b|ลิงก์ดูฟรี|ดูบอลฟรี|ถ่ายทอดสดฟรี|สตรีมเถื่อน|ลิงก์เถื่อน/i;

export type FilterReason = "link" | "gambling" | "piracy";

export interface FilterResult {
  ok: boolean;
  reason?: FilterReason;
}

export function screenComment(raw: string): FilterResult {
  const text = raw.normalize("NFKC");
  if (GAMBLING_RE.test(text)) return { ok: false, reason: "gambling" };
  if (URL_RE.test(text)) {
    // A bare link, and especially a link next to streaming bait, is rejected.
    return { ok: false, reason: PIRACY_RE.test(text) ? "piracy" : "link" };
  }
  return { ok: true };
}
