/**
 * 三期 D1 — live text commentary generation.
 *
 * Template-first: every entry is rendered from verified event/stat parameters
 * in all four locales with zero LLM cost. Only goals and red cards get one
 * extra "color" line from a fast LLM, and that prompt may only restate the
 * parameters it is given (the recap pipeline taught us writers invent facts
 * otherwise). All generation is deterministic per (fixture, dedupeKey) so
 * cron reruns are idempotent.
 */
import type {
  LiveCommentaryEntry,
  LiveFixtureEventSnapshot,
  LiveFixtureSummary,
  LiveStatsSnapshot,
} from "@skorly/types";

export const COMMENTARY_LOCALES = ["id", "vi", "en", "zh"] as const;
export type CommentaryLocale = (typeof COMMENTARY_LOCALES)[number];

export interface CommentaryContext {
  fixture: LiveFixtureSummary;
  statusShort: string | null;
  prevStatusShort: string | null;
  prevFixture: LiveFixtureSummary | null;
  newEvents: LiveFixtureEventSnapshot[];
  stats: LiveStatsSnapshot | null;
  prevStats: LiveStatsSnapshot | null;
}

export interface CommentaryEntryDraft {
  dedupeKey: string;
  sortKey: number;
  minute: number | null;
  type: string;
  texts: Record<string, string>;
}

type Texts = Record<CommentaryLocale, string>;

function score(f: LiveFixtureSummary): string {
  return `${f.homeGoals ?? 0}-${f.awayGoals ?? 0}`;
}

function entryToSnapshot(entry: CommentaryEntryDraft): LiveCommentaryEntry {
  return {
    key: entry.dedupeKey,
    sortKey: entry.sortKey,
    minute: entry.minute,
    type: entry.type,
    texts: entry.texts,
  };
}

/** Merge previous snapshot entries with new ones, deduped by key, sorted. */
export function mergeCommentary(
  previous: LiveCommentaryEntry[] | undefined,
  fresh: CommentaryEntryDraft[],
  cap = 60,
): LiveCommentaryEntry[] {
  const byKey = new Map<string, LiveCommentaryEntry>();
  for (const entry of previous ?? []) byKey.set(entry.key, entry);
  for (const draft of fresh) {
    if (!byKey.has(draft.dedupeKey)) byKey.set(draft.dedupeKey, entryToSnapshot(draft));
  }
  return [...byKey.values()].sort((a, b) => a.sortKey - b.sortKey).slice(-cap);
}

/* ------------------------------------------------------------------ */
/* Templates (4 locales, parameters only — never invented facts)       */
/* ------------------------------------------------------------------ */

function kickoffTexts(f: LiveFixtureSummary): Texts {
  const m = `${f.home.name} vs ${f.away.name}`;
  return {
    id: `⚽ Sepak mula! ${m} dimulai.`,
    vi: `⚽ Bóng lăn! ${m} bắt đầu.`,
    en: `⚽ Kick-off! ${m} is underway.`,
    zh: `⚽ 比赛开始！${m} 正式开打。`,
  };
}

function halftimeTexts(f: LiveFixtureSummary): Texts {
  const s = score(f);
  return {
    id: `⏸️ Turun minum. ${f.home.name} ${s} ${f.away.name}.`,
    vi: `⏸️ Hết hiệp một. ${f.home.name} ${s} ${f.away.name}.`,
    en: `⏸️ Half-time. ${f.home.name} ${s} ${f.away.name}.`,
    zh: `⏸️ 中场休息。${f.home.name} ${s} ${f.away.name}。`,
  };
}

function secondHalfTexts(): Texts {
  return {
    id: `▶️ Babak kedua dimulai.`,
    vi: `▶️ Hiệp hai bắt đầu.`,
    en: `▶️ The second half is underway.`,
    zh: `▶️ 下半场开始。`,
  };
}

function fulltimeTexts(f: LiveFixtureSummary): Texts {
  const s = score(f);
  return {
    id: `🏁 Laga usai. ${f.home.name} ${s} ${f.away.name}.`,
    vi: `🏁 Trận đấu kết thúc. ${f.home.name} ${s} ${f.away.name}.`,
    en: `🏁 Full-time. ${f.home.name} ${s} ${f.away.name}.`,
    zh: `🏁 全场结束。${f.home.name} ${s} ${f.away.name}。`,
  };
}

function goalTexts(
  f: LiveFixtureSummary,
  minute: number | null,
  player: string | null,
  team: string | null,
  detail: string | null,
): Texts {
  const who = player ?? "";
  const t = team ?? "";
  const s = score(f);
  const min = minute != null ? `${minute}'` : "";
  const pen = /penalty/i.test(detail ?? "");
  const og = /own goal/i.test(detail ?? "");
  const tagId = pen ? " (penalti)" : og ? " (gol bunuh diri)" : "";
  const tagVi = pen ? " (phạt đền)" : og ? " (phản lưới nhà)" : "";
  const tagEn = pen ? " (penalty)" : og ? " (own goal)" : "";
  const tagZh = pen ? "（点球）" : og ? "（乌龙球）" : "";
  return {
    id: `⚽ GOL! ${min} ${who}${t ? ` (${t})` : ""}${tagId} mencetak gol! ${f.home.name} ${s} ${f.away.name}.`,
    vi: `⚽ VÀO! ${min} ${who}${t ? ` (${t})` : ""}${tagVi} ghi bàn! ${f.home.name} ${s} ${f.away.name}.`,
    en: `⚽ GOAL! ${min} ${who}${t ? ` (${t})` : ""}${tagEn} scores! ${f.home.name} ${s} ${f.away.name}.`,
    zh: `⚽ 进球！${min} ${who}${t ? `（${t}）` : ""}${tagZh}破门！${f.home.name} ${s} ${f.away.name}。`,
  };
}

function cardTexts(
  minute: number | null,
  player: string | null,
  team: string | null,
  red: boolean,
): Texts {
  const who = player ?? "";
  const t = team ? ` (${team})` : "";
  const tZh = team ? `（${team}）` : "";
  const min = minute != null ? `${minute}'` : "";
  if (red) {
    return {
      id: `🟥 ${min} Kartu merah! ${who}${t} diusir keluar lapangan.`,
      vi: `🟥 ${min} Thẻ đỏ! ${who}${t} bị truất quyền thi đấu.`,
      en: `🟥 ${min} Red card! ${who}${t} is sent off.`,
      zh: `🟥 ${min} 红牌！${who}${tZh}被罚下。`,
    };
  }
  return {
    id: `🟨 ${min} Kartu kuning untuk ${who}${t}.`,
    vi: `🟨 ${min} Thẻ vàng cho ${who}${t}.`,
    en: `🟨 ${min} Yellow card for ${who}${t}.`,
    zh: `🟨 ${min} ${who}${tZh}吃到黄牌。`,
  };
}

function substitutionTexts(minute: number | null, player: string | null, team: string | null): Texts {
  const who = player ?? "";
  const t = team ?? "";
  const min = minute != null ? `${minute}'` : "";
  return {
    id: `🔄 ${min} Pergantian pemain ${t}: ${who}.`,
    vi: `🔄 ${min} ${t} thay người: ${who}.`,
    en: `🔄 ${min} Substitution for ${t}: ${who}.`,
    zh: `🔄 ${min} ${t} 进行换人调整：${who}。`,
  };
}

function varTexts(minute: number | null, detail: string | null): Texts {
  const min = minute != null ? `${minute}'` : "";
  const d = detail ?? "VAR";
  return {
    id: `📺 ${min} Tinjauan VAR: ${d}.`,
    vi: `📺 ${min} VAR can thiệp: ${d}.`,
    en: `📺 ${min} VAR review: ${d}.`,
    zh: `📺 ${min} VAR 介入：${d}。`,
  };
}

function statsTexts(f: LiveFixtureSummary, stats: LiveStatsSnapshot): Texts {
  const pos =
    stats.possessionHome != null && stats.possessionAway != null
      ? `${stats.possessionHome}%-${stats.possessionAway}%`
      : null;
  const shots =
    stats.shotsHome != null && stats.shotsAway != null
      ? `${stats.shotsHome}-${stats.shotsAway}`
      : null;
  const parts = (posLabel: string, shotLabel: string) =>
    [pos ? `${posLabel} ${pos}` : null, shots ? `${shotLabel} ${shots}` : null]
      .filter(Boolean)
      .join(", ");
  return {
    id: `📊 ${f.home.name} vs ${f.away.name}: ${parts("penguasaan bola", "tembakan")}.`,
    vi: `📊 ${f.home.name} vs ${f.away.name}: ${parts("kiểm soát bóng", "dứt điểm")}.`,
    en: `📊 ${f.home.name} vs ${f.away.name}: ${parts("possession", "shots")}.`,
    zh: `📊 ${f.home.name} vs ${f.away.name}：${parts("控球率", "射门")}。`,
  };
}

/* ------------------------------------------------------------------ */
/* Entry builders                                                      */
/* ------------------------------------------------------------------ */

function eventKey(event: LiveFixtureEventSnapshot): string {
  return [event.minute ?? "x", event.type ?? "x", event.detail ?? "x", event.playerName ?? "x"]
    .join("|")
    .toLowerCase();
}

/** Events present now but not in the previous snapshot. */
export function diffNewEvents(
  previous: LiveFixtureEventSnapshot[] | undefined,
  current: LiveFixtureEventSnapshot[],
): LiveFixtureEventSnapshot[] {
  const seen = new Set((previous ?? []).map(eventKey));
  return current.filter((event) => !seen.has(eventKey(event)));
}

const STATS_BUCKETS = [20, 35, 60, 80];

export function buildTemplateEntries(ctx: CommentaryContext): CommentaryEntryDraft[] {
  const out: CommentaryEntryDraft[] = [];
  const f = ctx.fixture;
  const elapsed = f.elapsed ?? 0;

  // Status transitions (raw API short codes: 1H, HT, 2H, FT...).
  const prevShort = ctx.prevStatusShort;
  const short = ctx.statusShort;
  const prevStatus = ctx.prevFixture?.status ?? null;
  if (f.status === "live" && (prevStatus == null || prevStatus === "scheduled")) {
    out.push({
      dedupeKey: "status:kickoff",
      sortKey: 0,
      minute: 0,
      type: "kickoff",
      texts: kickoffTexts(f),
    });
  }
  if (short === "HT" && prevShort !== "HT") {
    out.push({
      dedupeKey: "status:halftime",
      sortKey: 45_90,
      minute: 45,
      type: "halftime",
      texts: halftimeTexts(f),
    });
  }
  if (short === "2H" && prevShort === "HT") {
    out.push({
      dedupeKey: "status:second_half",
      sortKey: 46_00,
      minute: 46,
      type: "second_half",
      texts: secondHalfTexts(),
    });
  }
  if (f.status === "finished" && prevStatus != null && prevStatus !== "finished") {
    out.push({
      dedupeKey: "status:fulltime",
      sortKey: 99_990,
      minute: f.elapsed,
      type: "fulltime",
      texts: fulltimeTexts(f),
    });
  }

  // Event-driven entries.
  for (let i = 0; i < ctx.newEvents.length; i++) {
    const event = ctx.newEvents[i]!;
    const minute = event.minute;
    const base = (minute ?? elapsed) * 100 + i;
    const type = (event.type ?? "").toLowerCase();
    const detail = event.detail ?? "";

    if (type === "goal") {
      if (/missed penalty/i.test(detail)) continue;
      out.push({
        dedupeKey: `event:${eventKey(event)}`,
        sortKey: base + 50,
        minute,
        type: "goal",
        texts: goalTexts(f, minute, event.playerName, event.teamName, detail),
      });
    } else if (type === "card") {
      const red = /red/i.test(detail);
      out.push({
        dedupeKey: `event:${eventKey(event)}`,
        sortKey: base + 30,
        minute,
        type: red ? "red_card" : "yellow_card",
        texts: cardTexts(minute, event.playerName, event.teamName, red),
      });
    } else if (type === "subst") {
      out.push({
        dedupeKey: `event:${eventKey(event)}`,
        sortKey: base + 10,
        minute,
        type: "substitution",
        texts: substitutionTexts(minute, event.playerName, event.teamName),
      });
    } else if (type === "var") {
      out.push({
        dedupeKey: `event:${eventKey(event)}`,
        sortKey: base + 40,
        minute,
        type: "var",
        texts: varTexts(minute, event.detail),
      });
    }
  }

  // Stats digest when crossing a milestone minute with fresh stats.
  if (f.status === "live" && ctx.stats) {
    const prevElapsed = ctx.prevFixture?.elapsed ?? 0;
    for (const bucket of STATS_BUCKETS) {
      if (elapsed >= bucket && prevElapsed < bucket) {
        const texts = statsTexts(f, ctx.stats);
        if (texts.en.includes(":") && !texts.en.endsWith(": .")) {
          out.push({
            dedupeKey: `stats:${bucket}`,
            sortKey: bucket * 100 + 5,
            minute: elapsed,
            type: "stats",
            texts,
          });
        }
        break;
      }
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* AI colour line for big moments (goals, red cards)                   */
/* ------------------------------------------------------------------ */

interface ColorEnv {
  QWEN_API_KEY?: string;
  QWEN_BASE_URL?: string;
}

const COLOR_TIMEOUT_MS = 6_000;
const COLOR_MODEL = "qwen-flash";

function readColorEnv(): ColorEnv {
  return (
    (globalThis as { process?: { env?: ColorEnv } }).process?.env ?? {}
  );
}

/**
 * One LLM call per big moment returning all four locales as JSON. The prompt
 * forbids any fact not present in the parameters; on any failure we simply
 * keep the template entry.
 */
export async function buildColorEntry(
  draft: CommentaryEntryDraft,
  fixture: LiveFixtureSummary,
  fetchImpl: typeof fetch = fetch,
): Promise<CommentaryEntryDraft | null> {
  if (draft.type !== "goal" && draft.type !== "red_card") return null;
  const env = readColorEnv();
  if (!env.QWEN_API_KEY) return null;

  const baseUrl = (env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const facts = `Match: ${fixture.home.name} vs ${fixture.away.name}. Score now: ${score(fixture)}. Moment: ${draft.texts.en}`;
  const prompt = `You are a football commentator. Write ONE short, vivid commentary line (max 25 words) about this moment, in each of these languages: Indonesian (id), Vietnamese (vi), English (en), Simplified Chinese (zh).
STRICT RULES: Use ONLY the facts below. Do not add player history, statistics, or any detail not stated. No betting language.
FACTS: ${facts}
Reply with ONLY a JSON object: {"id":"...","vi":"...","en":"...","zh":"..."}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COLOR_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.QWEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: COLOR_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const texts = JSON.parse(match[0]) as Record<string, string>;
    if (!texts.id || !texts.vi || !texts.en || !texts.zh) return null;
    return {
      dedupeKey: `${draft.dedupeKey}:color`,
      sortKey: draft.sortKey + 1,
      minute: draft.minute,
      type: "color",
      texts: {
        id: String(texts.id).slice(0, 280),
        vi: String(texts.vi).slice(0, 280),
        en: String(texts.en).slice(0, 280),
        zh: String(texts.zh).slice(0, 280),
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
