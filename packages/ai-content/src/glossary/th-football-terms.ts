/**
 * Thai football terminology and brand-safety guardrails for Skorly.
 * Keep prediction copy analytical and editorial, never gambling-led.
 */
export const TH_FOOTBALL_TERMS: Record<string, string> = {
  "World Cup 2026": "ฟุตบอลโลก 2026",
  "live scores": "ผลบอลสด",
  schedule: "ตารางบอล",
  fixtures: "โปรแกรมการแข่งขัน",
  prediction: "วิเคราะห์ / คาดการณ์",
  "score prediction": "คาดการณ์สกอร์",
  "model probability": "โอกาสจากโมเดล",
  odds: "โอกาสจากโมเดล",
  bookies: "การประเมินทั่วไป",
  stakes: "ความสำคัญของเกม",
  "high-stakes": "มีความสำคัญสูง",
  "dark horse": "ม้ามืด",
  standings: "ตารางคะแนน",
  group: "กลุ่ม",
  kickoff: "เวลาเริ่มแข่งขัน",
  "full-time": "จบเกม",
  "half-time": "พักครึ่ง",
  preview: "พรีวิว",
  "match recap": "สรุปผลการแข่งขัน",
  team: "ทีม",
  "national team": "ทีมชาติ",
};

export const TH_FORBIDDEN_TERMS = [
  "แทงบอล",
  "เว็บพนัน",
  "ราคาบอล",
  "ทีเด็ดบอล",
  "พนันบอล",
  "เจ้ามือ",
  "อัตราต่อรอง",
  "เดิมพัน",
  "odds",
  "bookies",
  "bookmaker",
  "stake",
  "stakes",
] as const;

export const TH_PIRACY_TERMS = [
  "ลิงก์ดูฟรี",
  "ดูบอลฟรี",
  "ถ่ายทอดสดฟรี",
  "สตรีมเถื่อน",
  "ลิงก์เถื่อน",
  "เถื่อน",
] as const;

export function thaiGlossaryBlock(): string {
  const lines = Object.entries(TH_FOOTBALL_TERMS).map(
    ([en, th]) => `- ${en} -> ${th}`,
  );
  return [
    "Use these Thai football terms consistently:",
    ...lines,
    "",
    "Avoid gambling-led SEO or unsafe copy. Do not use these terms:",
    ...TH_FORBIDDEN_TERMS.map((term) => `- ${term}`),
    "When the English source uses odds/probability in an analytical model context, translate it as neutral model probability (for example โอกาสจากโมเดล), never as bookmaker odds or อัตราต่อรอง.",
    "When the English source mentions bookies, betting markets or market favorites, neutralize it as การประเมินทั่วไป or ทีมที่ถูกมองว่าเป็นตัวเต็ง. Do not keep bookies, bookmaker, odds, stake or stakes in English.",
    "When the English source uses stakes/high-stakes in a sports context, translate it as ความสำคัญของเกม or ความหมายของเกม, never as เดิมพัน.",
    "When the English source uses raw, wild, underdog or dark-horse imagery, use neutral football language such as ม้ามืด, ทีมรอง or พลังดิบ. Never use เถื่อน unless discussing illegal streaming, which should not appear in publishable copy.",
    "",
    "Do not provide or imply illegal streaming access. Avoid:",
    ...TH_PIRACY_TERMS.map((term) => `- ${term}`),
  ].join("\n");
}
