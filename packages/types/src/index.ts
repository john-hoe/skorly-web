/** Shared domain types used across web, jobs and ai-content. */

export const ALL_LOCALES = ["id", "vi", "en", "zh", "th"] as const;
export const PUBLIC_LOCALES = ALL_LOCALES;
export const INDEXABLE_LOCALES = PUBLIC_LOCALES;

export type Locale = (typeof ALL_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  id: "ID",
  vi: "VI",
  en: "EN",
  zh: "中文",
  th: "TH",
};

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  id: "id",
  vi: "vi",
  en: "en",
  zh: "zh-Hans",
  th: "th",
};

export const LOCALE_HREFLANG: Record<Locale, string> = {
  id: "id",
  vi: "vi",
  en: "en",
  zh: "zh-Hans",
  th: "th-TH",
};

export const LOCALE_OG: Record<Locale, string> = {
  id: "id_ID",
  vi: "vi_VN",
  en: "en_PH",
  zh: "zh_CN",
  th: "th_TH",
};

const LOCALIZED_SEGMENTS: Record<
  Locale,
  {
    worldCup: string;
    group: string;
    match: string;
    teams: string;
    schedule: string;
    stories: string;
    watch: string;
    advertise: string;
    article: string;
    author: string;
    news: string;
    articles: string;
    scores: string;
    login: string;
    register: string;
    forgotPassword: string;
    resetPassword: string;
    account: string;
    predictions: string;
    leaderboard: string;
    league: string;
  }
> = {
  id: {
    worldCup: "piala-dunia-2026",
    group: "grup",
    match: "pertandingan",
    teams: "tim",
    schedule: "jadwal",
    stories: "cerita",
    watch: "nonton",
    advertise: "iklan",
    article: "artikel",
    author: "penulis",
    news: "berita",
    articles: "arsip",
    scores: "skor-langsung",
    login: "masuk",
    register: "daftar",
    forgotPassword: "lupa-sandi",
    resetPassword: "atur-ulang-sandi",
    account: "akun",
    predictions: "prediksi",
    leaderboard: "peringkat",
    league: "liga",
  },
  vi: {
    worldCup: "world-cup-2026",
    group: "bang",
    match: "tran-dau",
    teams: "doi-tuyen",
    schedule: "lich-thi-dau",
    stories: "cau-chuyen",
    watch: "xem-o-dau",
    advertise: "quang-cao",
    article: "bai-viet",
    author: "tac-gia",
    news: "tin-tuc",
    articles: "luu-tru",
    scores: "ket-qua-truc-tiep",
    login: "masuk",
    register: "daftar",
    forgotPassword: "lupa-sandi",
    resetPassword: "atur-ulang-sandi",
    account: "akun",
    predictions: "prediksi",
    leaderboard: "peringkat",
    league: "liga",
  },
  en: {
    worldCup: "world-cup-2026",
    group: "group",
    match: "match",
    teams: "teams",
    schedule: "schedule",
    stories: "web-stories",
    watch: "where-to-watch",
    advertise: "advertise",
    article: "article",
    author: "author",
    news: "news",
    articles: "articles",
    scores: "live-scores",
    login: "masuk",
    register: "daftar",
    forgotPassword: "lupa-sandi",
    resetPassword: "atur-ulang-sandi",
    account: "akun",
    predictions: "prediksi",
    leaderboard: "peringkat",
    league: "liga",
  },
  zh: {
    worldCup: "shijiebei-2026",
    group: "xiaozu",
    match: "bisai",
    teams: "qiudui",
    schedule: "saicheng",
    stories: "gushi",
    watch: "zhibo",
    advertise: "guanggao",
    article: "wenzhang",
    author: "zuozhe",
    news: "xinwen",
    articles: "quanbu-wenzhang",
    scores: "shishi-bifen",
    login: "masuk",
    register: "daftar",
    forgotPassword: "lupa-sandi",
    resetPassword: "atur-ulang-sandi",
    account: "akun",
    predictions: "prediksi",
    leaderboard: "peringkat",
    league: "liga",
  },
  th: {
    worldCup: "ฟุตบอลโลก-2026",
    group: "กลุ่ม",
    match: "การแข่งขัน",
    teams: "ทีม",
    schedule: "ตารางบอล",
    stories: "เว็บสตอรี่",
    watch: "ดูบอล",
    advertise: "โฆษณา",
    article: "บทความ",
    author: "ผู้เขียน",
    news: "ข่าว",
    articles: "บทความทั้งหมด",
    scores: "ผลบอลสด",
    login: "masuk",
    register: "daftar",
    forgotPassword: "lupa-sandi",
    resetPassword: "atur-ulang-sandi",
    account: "akun",
    predictions: "prediksi",
    leaderboard: "peringkat",
    league: "liga",
  },
};

export type LocalizedRouteKind =
  | "home"
  | "worldCup"
  | "group"
  | "match"
  | "teams"
  | "team"
  | "schedule"
  | "stories"
  | "story"
  | "watch"
  | "advertise"
  | "privacy"
  | "terms"
  | "article"
  | "author"
  | "news"
  | "articles"
  | "scores"
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword"
  | "account"
  | "predictions"
  | "leaderboard"
  | "aiProfile"
  | "league"
  | "leagueDetail";

export function isLocale(value: string): value is Locale {
  return (ALL_LOCALES as readonly string[]).includes(value);
}

export function localizedSitePath(
  locale: Locale | string,
  kind: LocalizedRouteKind,
  params: { slug?: string; group?: string } = {},
): string {
  const l = isLocale(locale) ? locale : "id";
  const s = LOCALIZED_SEGMENTS[l];
  switch (kind) {
    case "home":
      return `/${l}`;
    case "worldCup":
      return `/${l}/${s.worldCup}`;
    case "group":
      return `/${l}/${s.worldCup}/${s.group}/${params.group ?? ""}`;
    case "match":
      return `/${l}/${s.match}/${params.slug ?? ""}`;
    case "teams":
      return `/${l}/${s.teams}`;
    case "team":
      return `/${l}/${s.teams}/${params.slug ?? ""}`;
    case "schedule":
      return `/${l}/${s.schedule}`;
    case "stories":
      return `/${l}/${s.stories}`;
    case "story":
      return `/${l}/${s.stories}/${params.slug ?? ""}`;
    case "watch":
      return `/${l}/${s.watch}`;
    case "advertise":
      return `/${l}/${s.advertise}`;
    case "privacy":
      return `/${l}/privacy`;
    case "terms":
      return `/${l}/terms`;
    case "article":
      return `/${l}/${s.article}/${params.slug ?? ""}`;
    case "author":
      return `/${l}/${s.author}/${params.slug ?? ""}`;
    case "news":
      return `/${l}/${s.news}`;
    case "articles":
      return `/${l}/${s.articles}`;
    case "scores":
      return `/${l}/${s.scores}`;
    case "login":
      return `/${l}/${s.login}`;
    case "register":
      return `/${l}/${s.register}`;
    case "forgotPassword":
      return `/${l}/${s.forgotPassword}`;
    case "resetPassword":
      return `/${l}/${s.resetPassword}`;
    case "account":
      return `/${l}/${s.account}`;
    case "predictions":
      return `/${l}/${s.predictions}`;
    case "leaderboard":
      return `/${l}/${s.leaderboard}`;
    case "aiProfile":
      return `/${l}/${s.leaderboard}/ai/${params.slug ?? ""}`;
    case "league":
      return `/${l}/${s.league}`;
    case "leagueDetail":
      return `/${l}/${s.league}/${params.slug ?? ""}`;
  }
}

export const ARTICLE_TYPES = [
  "preview",
  "watchpoints",
  "prediction",
  "recap",
  "tactical",
  "group_analysis",
  "news",
] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export type FixtureStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type CampaignType = "subscribe" | "predict" | "lottery" | "referral";

export interface TeamLite {
  apiId: number;
  name: string;
  slug: string;
  code?: string | null;
  logo?: string | null;
}

export interface FixtureLite {
  apiId: number;
  slug: string;
  groupName?: string | null;
  stage?: string | null;
  kickoffAt?: string | null;
  home: TeamLite;
  away: TeamLite;
  status: FixtureStatus;
  homeGoals?: number | null;
  awayGoals?: number | null;
}

export interface LiveTeamSnapshot {
  id: number | null;
  name: string;
  slug: string;
  code: string | null;
  logo: string | null;
}

export interface LiveFixtureSummary {
  id: number;
  apiId: number;
  slug: string;
  round: string | null;
  groupName: string | null;
  kickoffAt: string | null;
  status: FixtureStatus;
  elapsed: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  home: LiveTeamSnapshot;
  away: LiveTeamSnapshot;
}

export interface LiveFixtureEventSnapshot {
  minute: number | null;
  type: string | null;
  detail: string | null;
  teamId: number | null;
  teamName: string | null;
  playerName: string | null;
}

/** Head-to-head live technical statistics (subset of /fixtures/statistics). */
export interface LiveStatsSnapshot {
  updatedAt: string;
  possessionHome: number | null;
  possessionAway: number | null;
  shotsHome: number | null;
  shotsAway: number | null;
  shotsOnHome: number | null;
  shotsOnAway: number | null;
  cornersHome: number | null;
  cornersAway: number | null;
  foulsHome: number | null;
  foulsAway: number | null;
}

/** Rolling sample used by the client-side momentum gauge. */
export interface LiveStatsSample {
  at: string;
  elapsed: number | null;
  shotsHome: number | null;
  shotsAway: number | null;
}

/** One live text-commentary entry; texts keyed by locale. */
export interface LiveCommentaryEntry {
  /** Stable dedupe key, also used to merge snapshot updates client-side. */
  key: string;
  sortKey: number;
  minute: number | null;
  type: string;
  texts: Record<string, string>;
}

export interface LiveFixtureSnapshot {
  generatedAt: string;
  fixture: LiveFixtureSummary;
  events: LiveFixtureEventSnapshot[];
  /** Raw API status short code (e.g. HT, FT) for richer commentary states. */
  statusShort?: string | null;
  stats?: LiveStatsSnapshot | null;
  statsHistory?: LiveStatsSample[];
  commentary?: LiveCommentaryEntry[];
}

export interface LiveAllSnapshot {
  generatedAt: string;
  fixtures: LiveFixtureSummary[];
  apiCallsToday: number;
  quotaState: "normal" | "event_trigger_only" | "slowdown" | "stopped";
}

/** Prediction strategy each Skorly AI persona follows. */
export type AiPredictorStrategy = "model" | "sampled" | "upset" | "cautious";

/** One "Skorly AI" predictor account's public metadata. */
export interface AiPredictorMeta {
  /** URL slug for the public detail page, e.g. "elo". */
  slug: string;
  /** Seed auth email — the stable join key to the profiles row. */
  email: string;
  /** Display name shown on the leaderboard, e.g. "Skorly AI · Elo". */
  name: string;
  strategy: AiPredictorStrategy;
}

/**
 * The four "Skorly AI" predictor accounts (seeded by
 * apps/jobs/scripts/seed-ai-predictors.ts). Single source of truth shared by
 * jobs (prediction generation), web (AI detection + the public detail page)
 * and the badge job.
 */
export const AI_PREDICTORS: AiPredictorMeta[] = [
  { slug: "elo", email: "ai-elo@skorly.cc", name: "Skorly AI · Elo", strategy: "model" },
  { slug: "poisson", email: "ai-poisson@skorly.cc", name: "Skorly AI · Poisson", strategy: "sampled" },
  { slug: "brave", email: "ai-brave@skorly.cc", name: "Skorly AI · Brave", strategy: "upset" },
  { slug: "cautious", email: "ai-cautious@skorly.cc", name: "Skorly AI · Cautious", strategy: "cautious" },
];

/** Emails of the four AI predictor accounts (derived; single source above). */
export const AI_PREDICTOR_EMAILS: string[] = AI_PREDICTORS.map((p) => p.email);

export function aiPredictorByEmail(email: string | null | undefined): AiPredictorMeta | undefined {
  if (!email) return undefined;
  return AI_PREDICTORS.find((p) => p.email === email);
}

export function aiPredictorBySlug(slug: string): AiPredictorMeta | undefined {
  return AI_PREDICTORS.find((p) => p.slug === slug);
}

/** Minimum scored predictions in a week to qualify for the AI Slayer badge. */
export const AI_SLAYER_MIN_PLAYED = 3;

/** One badge entry inside profiles.badges (jsonb array). */
export interface ProfileBadge {
  /** Unique per award, e.g. "ai_slayer:2026-W25". */
  id: string;
  kind: "ai_slayer";
  /** ISO week the badge was earned for, e.g. "2026-W25". */
  week: string;
  /** Weekly points the user scored when earning it. */
  points: number;
  awardedAt: string;
}

/** ISO week label (e.g. "2026-W25") plus its [start, end) UTC window. */
export interface IsoWeekWindow {
  label: string;
  start: Date;
  end: Date;
}

function startOfIsoWeekUtc(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = out.getUTCDay(); // 0=Sun..6=Sat
  out.setUTCDate(out.getUTCDate() - ((day + 6) % 7));
  return out;
}

function isoWeekLabel(weekStart: Date): string {
  // ISO week number = week containing that week's Thursday.
  const thursday = new Date(weekStart);
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Start = startOfIsoWeekUtc(jan4);
  const week = 1 + Math.round((weekStart.getTime() - week1Start.getTime()) / (7 * 86400000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The ISO week (Mon 00:00 UTC → next Mon) containing `now`. */
export function isoWeekContaining(now: Date = new Date()): IsoWeekWindow {
  const start = startOfIsoWeekUtc(now);
  return { label: isoWeekLabel(start), start, end: new Date(start.getTime() + 7 * 86400000) };
}

/** The most recent fully-completed ISO week before `now`. */
export function isoWeekBefore(now: Date = new Date()): IsoWeekWindow {
  const currentStart = startOfIsoWeekUtc(now);
  const start = new Date(currentStart.getTime() - 7 * 86400000);
  return { label: isoWeekLabel(start), start, end: currentStart };
}

/** Result of one content-QA pass, stored in articles.qa_log. */
export interface QaRound {
  round: number;
  model: string;
  fluency: number;
  factual: number;
  seo: number;
  overall: number;
  notes?: string;
}

export const NEWS_PIPELINE_DRAFT_REASON_CODES = [
  "thin_fact_sheet",
  "web_factcheck_fail",
  "unsupported_claim",
  "contradicted_fact",
  "language_quality_fail",
  "quality_gate_fail",
  "spam_topic",
  "repair_failed",
  "unknown",
] as const;

export type NewsPipelineDraftReasonCode = (typeof NEWS_PIPELINE_DRAFT_REASON_CODES)[number];

export const NEWS_PIPELINE_DRAFT_REASON_LABELS: Record<NewsPipelineDraftReasonCode, string> = {
  thin_fact_sheet: "facts too thin",
  web_factcheck_fail: "web fact-check failed",
  unsupported_claim: "unsupported claim",
  contradicted_fact: "contradicted fact",
  language_quality_fail: "language/translation gate",
  quality_gate_fail: "quality gate failed",
  spam_topic: "spam/noisy topic",
  repair_failed: "repair failed",
  unknown: "unknown",
};

function flattenQaLogValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenQaLogValue).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(flattenQaLogValue)
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function addReason(
  reasons: NewsPipelineDraftReasonCode[],
  code: NewsPipelineDraftReasonCode,
): void {
  if (!reasons.includes(code)) reasons.push(code);
}

export function classifyNewsPipelineDraftReasons(input: {
  title?: string | null;
  qaLog?: unknown;
  qualityScore?: number | null;
  status?: string | null;
}): NewsPipelineDraftReasonCode[] {
  const text = `${input.title ?? ""} ${flattenQaLogValue(input.qaLog)}`.toLowerCase();
  const reasons: NewsPipelineDraftReasonCode[] = [];

  if (
    /\b(live\s*stream|streaming|watch\s+live|link\s+\d+|free\s+stream|casino|betting|odds|prediction|airdrop|crypto)\b/i.test(
      text,
    )
  ) {
    addReason(reasons, "spam_topic");
  }
  if (/\b(only|fewer than)\s+\d+\s+fact|thin fact|facts?\s*<|not enough facts?/i.test(text)) {
    addReason(reasons, "thin_fact_sheet");
  }
  if (/web[-\s]?factcheck failed|web fact-check failed|unverifiable|contradicted/i.test(text)) {
    addReason(reasons, "web_factcheck_fail");
  }
  if (/unsupported|not supported|not in facts?|not present in facts?|invented|hallucinat/i.test(text)) {
    addReason(reasons, "unsupported_claim");
  }
  if (/contradict|wrong score|wrong date|wrong venue|inconsistent/i.test(text)) {
    addReason(reasons, "contradicted_fact");
  }
  if (/wrong output language|translation|thai-quality-gate|missing entity|language/i.test(text)) {
    addReason(reasons, "language_quality_fail");
  }
  if (typeof input.qualityScore === "number" && input.qualityScore < 75) {
    addReason(reasons, "quality_gate_fail");
  }
  if (/repair failed|fix failed|still failed/i.test(text)) {
    addReason(reasons, "repair_failed");
  }

  return reasons.length ? reasons : ["unknown"];
}
