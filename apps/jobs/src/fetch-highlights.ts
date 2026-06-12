/**
 * 三期 D3 — official highlight discovery. For recently finished fixtures
 * without a stored highlight, search YouTube Data API v3 restricted to a
 * whitelist of official channels, validate the title mentions both teams,
 * and persist the embed reference. We never download or re-host video —
 * the web app renders the official YouTube iframe embed only.
 *
 * Quota: search.list costs 100 units (free tier: 10,000/day). Attempts are
 * capped at 3 per fixture spaced ≥2h apart via a KV marker, so even a
 * 4-match day stays under ~2,400 units.
 */
import {
  getFixtureMedia,
  getResultsFixtures,
  insertFixtureMediaDeduped,
  type FixtureView,
} from "@skorly/db";

/**
 * Official channels only. Add per-market rights holders here after manually
 * verifying their channel IDs (changes go through PR review).
 */
export const HIGHLIGHT_CHANNELS: Array<{ name: string; channelId: string }> = [
  { name: "FIFA", channelId: "UCpcTrCXblq78GZrTUTLWeBw" },
];

const SEARCH_WINDOW_HOURS = 48;
const MIN_AGE_MINUTES = 45;
const MAX_ATTEMPTS = 3;
const ATTEMPT_SPACING_MS = 2 * 60 * 60 * 1000;
const ATTEMPT_KEY_PREFIX = "hl:attempt:";
const ATTEMPT_TTL_SECONDS = 3 * 24 * 60 * 60;

interface YoutubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
  };
}

interface AttemptMarker {
  count: number;
  lastAt: number;
}

function readEnv(): { YOUTUBE_API_KEY?: string } {
  return (
    (globalThis as { process?: { env?: { YOUTUBE_API_KEY?: string } } }).process?.env ?? {}
  );
}

/** Loose containment: every significant word of the team name in the title. */
export function titleMentionsTeam(title: string, teamName: string): boolean {
  const t = title.toLowerCase();
  const words = teamName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !["the", "and", "republic"].includes(w));
  if (!words.length) return t.includes(teamName.toLowerCase());
  return words.every((w) => t.includes(w));
}

export function isHighlightMatch(title: string, home: string, away: string): boolean {
  return titleMentionsTeam(title, home) && titleMentionsTeam(title, away);
}

async function readAttempt(kv: KVNamespace, fixtureId: number): Promise<AttemptMarker> {
  const raw = await kv.get(`${ATTEMPT_KEY_PREFIX}${fixtureId}`);
  if (!raw) return { count: 0, lastAt: 0 };
  try {
    const parsed = JSON.parse(raw) as AttemptMarker;
    return { count: parsed.count ?? 0, lastAt: parsed.lastAt ?? 0 };
  } catch {
    return { count: 0, lastAt: 0 };
  }
}

async function writeAttempt(kv: KVNamespace, fixtureId: number, marker: AttemptMarker): Promise<void> {
  await kv.put(`${ATTEMPT_KEY_PREFIX}${fixtureId}`, JSON.stringify(marker), {
    expirationTtl: ATTEMPT_TTL_SECONDS,
  });
}

async function searchChannel(
  apiKey: string,
  channelId: string,
  query: string,
  publishedAfter: string,
  fetchImpl: typeof fetch,
): Promise<YoutubeSearchItem[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("publishedAfter", publishedAfter);

  const res = await fetchImpl(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube search failed: ${res.status}`);
  }
  const payload = (await res.json()) as { items?: YoutubeSearchItem[] };
  return payload.items ?? [];
}

export interface FetchHighlightsResult {
  ok: boolean;
  skipped: boolean;
  reason?: "no_key" | "no_candidates";
  fixtures: number;
  searches: number;
  found: number;
}

export async function fetchHighlights(opts: {
  kv: KVNamespace;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<FetchHighlightsResult> {
  const apiKey = readEnv().YOUTUBE_API_KEY;
  if (!apiKey) {
    return { ok: true, skipped: true, reason: "no_key", fixtures: 0, searches: 0, found: 0 };
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? new Date();
  const nowMs = now.getTime();

  const candidates = (await getResultsFixtures(20)).filter((f) => {
    if (f.status !== "finished" || !f.kickoffAt) return false;
    const sinceKickoff = nowMs - new Date(f.kickoffAt).getTime();
    // ~Full time (105') + MIN_AGE buffer for the channel to upload, up to the
    // 48h search window.
    return (
      sinceKickoff > (105 + MIN_AGE_MINUTES) * 60 * 1000 &&
      sinceKickoff < SEARCH_WINDOW_HOURS * 60 * 60 * 1000
    );
  });

  if (!candidates.length) {
    return { ok: true, skipped: true, reason: "no_candidates", fixtures: 0, searches: 0, found: 0 };
  }

  let searches = 0;
  let found = 0;
  let processed = 0;

  for (const fixture of candidates) {
    const existing = await getFixtureMedia(fixture.id).catch(() => []);
    if (existing.length) continue;

    const attempt = await readAttempt(opts.kv, fixture.id);
    if (attempt.count >= MAX_ATTEMPTS) continue;
    if (nowMs - attempt.lastAt < ATTEMPT_SPACING_MS) continue;

    processed += 1;
    await writeAttempt(opts.kv, fixture.id, { count: attempt.count + 1, lastAt: nowMs });

    const media = await collectHighlights(apiKey, fixture, fetchImpl, (n) => {
      searches += n;
    }).catch((error) => {
      console.error(`[highlights] search failed for ${fixture.slug}`, error);
      return [];
    });

    if (media.length) {
      const inserted = await insertFixtureMediaDeduped(fixture.id, media);
      found += inserted;
      console.log(`[highlights] ${fixture.slug}: stored ${inserted} official embed(s)`);
    }
  }

  return { ok: true, skipped: false, fixtures: processed, searches, found };
}

async function collectHighlights(
  apiKey: string,
  fixture: FixtureView,
  fetchImpl: typeof fetch,
  countSearch: (n: number) => void,
): Promise<
  Array<{
    videoId: string;
    title: string | null;
    channelId: string | null;
    channelTitle: string | null;
    publishedAt: Date | null;
  }>
> {
  const publishedAfter = fixture.kickoffAt
    ? new Date(fixture.kickoffAt).toISOString()
    : new Date(Date.now() - SEARCH_WINDOW_HOURS * 3600_000).toISOString();
  const query = `${fixture.home.name} ${fixture.away.name} highlights`;

  for (const channel of HIGHLIGHT_CHANNELS) {
    countSearch(1);
    const items = await searchChannel(apiKey, channel.channelId, query, publishedAfter, fetchImpl);
    const valid = items.filter((item) => {
      const title = item.snippet?.title ?? "";
      return (
        item.id?.videoId &&
        item.snippet?.channelId === channel.channelId &&
        isHighlightMatch(title, fixture.home.name, fixture.away.name)
      );
    });
    if (valid.length) {
      // One embed per fixture is enough; take the newest valid hit.
      const item = valid[0]!;
      return [
        {
          videoId: item.id!.videoId!,
          title: item.snippet?.title ?? null,
          channelId: item.snippet?.channelId ?? null,
          channelTitle: item.snippet?.channelTitle ?? null,
          publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt) : null,
        },
      ];
    }
  }
  return [];
}
