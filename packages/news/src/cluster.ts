import type { RawSignal, SignalSource } from "./types";
import { sourceWeight } from "./filter";

export type TopicCategory =
  | "transfer"
  | "injury"
  | "result"
  | "lineup"
  | "preview"
  | "general";

export interface TopicCluster {
  key: string;
  title: string;
  category: TopicCategory;
  entities: { teams: string[]; players: string[] };
  signals: RawSignal[];
  heat: number;
}

const CATEGORY_KEYWORDS: Record<Exclude<TopicCategory, "general">, string[]> = {
  transfer: ["transfer", "sign", "signing", "deal", "move", "joins", "agreement", "medical", "here we go"],
  injury: ["injury", "injured", "out for", "ruled out", "doubt", "fitness", "knock"],
  result: ["full-time", "ft:", "wins", "beat", "draw", "result", "final score"],
  lineup: ["lineup", "line-up", "starting xi", "confirmed xi", "team news"],
  preview: ["preview", "vs", "face", "clash", "ahead of", "prediction"],
};

function detectCategory(text: string): TopicCategory {
  const lower = text.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return cat as TopicCategory;
  }
  return "general";
}

function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(" ");
}

function clusterKey(s: RawSignal, category: TopicCategory): string {
  const teams = s.entities?.teams ?? [];
  if (teams.length) {
    return `${category}:${[...teams].map((t) => t.toLowerCase()).sort().join("+")}`;
  }
  return `${category}:${normalizeTitle(s.title)}`;
}

/**
 * Group signals into deduped topic clusters and score heat.
 * heat = signal count + source diversity bonus + recency bonus.
 */
export function clusterSignals(signals: RawSignal[]): TopicCluster[] {
  const map = new Map<string, TopicCluster>();

  for (const s of signals) {
    const category = detectCategory(s.title);
    const key = clusterKey(s, category);
    let c = map.get(key);
    if (!c) {
      c = {
        key,
        title: s.title,
        category,
        entities: { teams: [...(s.entities?.teams ?? [])], players: [...(s.entities?.players ?? [])] },
        signals: [],
        heat: 0,
      };
      map.set(key, c);
    }
    c.signals.push(s);
    for (const t of s.entities?.teams ?? []) {
      if (!c.entities.teams.includes(t)) c.entities.teams.push(t);
    }
    for (const p of s.entities?.players ?? []) {
      if (!c.entities.players.includes(p)) c.entities.players.push(p);
    }
  }

  const now = Date.now();
  for (const c of map.values()) {
    const sources = new Set<SignalSource>(c.signals.map((x) => x.source));
    const newest = Math.max(
      ...c.signals.map((x) => x.publishedAt?.getTime() ?? 0),
      0
    );
    const ageHours = newest ? (now - newest) / 3_600_000 : 48;
    const recencyBonus = ageHours < 3 ? 3 : ageHours < 12 ? 1 : 0;
    // Trust-weighted signal mass: best per-source weight in the cluster.
    const weight = Math.max(...c.signals.map((x) => sourceWeight(x.source)), 1);
    c.heat = c.signals.length + (sources.size - 1) * 2 + recencyBonus + weight;
  }

  return [...map.values()].sort((a, b) => b.heat - a.heat);
}
