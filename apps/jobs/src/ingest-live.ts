import {
  ApiFootballClient,
  ApiFootballError,
  STATUS_MAP,
  WORLD_CUP_LEAGUE_ID,
  type AfFixture,
  type AfFixtureEvent,
} from "@skorly/api-football";
import {
  getFixtureEvents,
  getFixturesForLiveIngestWindow,
  getTeamIdsByApiIds,
  insertFixtureEventsDeduped,
  updateLiveFixtureState,
  type FixtureEventInsertInput,
  type LiveFixtureStatus,
  type LiveIngestFixtureView,
} from "@skorly/db";
import type {
  FixtureStatus,
  LiveAllSnapshot,
  LiveFixtureEventSnapshot,
  LiveFixtureSnapshot,
  LiveFixtureSummary,
} from "@skorly/types";

const LIVE_ALL_KEY = "live:all";
const LIVE_FIXTURE_PREFIX = "live:fixture:";
const API_QUOTA_PREFIX = "apiq:";
const SNAPSHOT_TTL_SECONDS = 90;
const QUOTA_TTL_SECONDS = 3 * 24 * 60 * 60;
const EVENT_TRIGGER_ONLY_AT = 6_000;
const SLOWDOWN_AT = 7_000;
const STOP_AT = 7_300;

export interface IngestLiveOptions {
  apiKey: string;
  baseUrl?: string;
  season?: number;
  leagueId?: number;
  kv: KVNamespace;
  now?: Date;
  fetchImpl?: typeof fetch;
}

export interface IngestLiveResult {
  ok: boolean;
  skipped: boolean;
  reason?: "no_window" | "quota_slowdown" | "quota_stop" | "rate_limited" | "not_configured";
  fixtures: number;
  events: number;
  reconciled: number;
  apiCalls: number;
  apiCallsToday: number;
  quotaState: LiveAllSnapshot["quotaState"];
}

function quotaDay(now: Date): string {
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

function quotaKey(now: Date): string {
  return `${API_QUOTA_PREFIX}${quotaDay(now)}`;
}

function fixtureKey(fixtureId: number): string {
  return `${LIVE_FIXTURE_PREFIX}${fixtureId}`;
}

function quotaState(apiCallsToday: number): LiveAllSnapshot["quotaState"] {
  if (apiCallsToday >= STOP_AT) return "stopped";
  if (apiCallsToday >= SLOWDOWN_AT) return "slowdown";
  if (apiCallsToday >= EVENT_TRIGGER_ONLY_AT) return "event_trigger_only";
  return "normal";
}

async function readApiCallsToday(kv: KVNamespace, now: Date): Promise<number> {
  const raw = await kv.get(quotaKey(now));
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

async function writeApiCallsToday(kv: KVNamespace, now: Date, value: number): Promise<void> {
  await kv.put(quotaKey(now), String(value), { expirationTtl: QUOTA_TTL_SECONDS });
}

async function writeLiveAll(
  kv: KVNamespace,
  snapshot: LiveAllSnapshot,
): Promise<void> {
  await kv.put(LIVE_ALL_KEY, JSON.stringify(snapshot), { expirationTtl: SNAPSHOT_TTL_SECONDS });
}

async function writeLiveFixture(
  kv: KVNamespace,
  snapshot: LiveFixtureSnapshot,
): Promise<void> {
  await kv.put(fixtureKey(snapshot.fixture.id), JSON.stringify(snapshot), {
    expirationTtl: SNAPSHOT_TTL_SECONDS,
  });
}

async function readLiveFixture(
  kv: KVNamespace,
  fixtureId: number,
): Promise<LiveFixtureSnapshot | null> {
  const raw = await kv.get(fixtureKey(fixtureId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LiveFixtureSnapshot;
  } catch {
    return null;
  }
}

function mapStatus(short: string): FixtureStatus {
  return (STATUS_MAP[short] as FixtureStatus) ?? "scheduled";
}

function toLiveStatus(status: FixtureStatus): LiveFixtureStatus {
  return status;
}

function toSummary(dbFixture: LiveIngestFixtureView, apiFixture: AfFixture): LiveFixtureSummary {
  return {
    id: dbFixture.id,
    apiId: dbFixture.apiId,
    slug: dbFixture.slug,
    round: dbFixture.round,
    groupName: dbFixture.groupName,
    kickoffAt: dbFixture.kickoffAt ? dbFixture.kickoffAt.toISOString() : null,
    status: mapStatus(apiFixture.fixture.status.short),
    elapsed: apiFixture.fixture.status.elapsed,
    homeGoals: apiFixture.goals.home,
    awayGoals: apiFixture.goals.away,
    home: dbFixture.home,
    away: dbFixture.away,
  };
}

function scoreOrStatusChanged(
  previous: LiveFixtureSnapshot | null,
  next: LiveFixtureSummary,
): boolean {
  const old = previous?.fixture;
  if (!old) return true;
  return (
    old.status !== next.status ||
    old.homeGoals !== next.homeGoals ||
    old.awayGoals !== next.awayGoals
  );
}

function isWorldCupFixture(fixture: AfFixture, leagueId: number, season: number): boolean {
  return fixture.league.id === leagueId && fixture.league.season === season;
}

function eventMinute(event: AfFixtureEvent): number | null {
  const elapsed = event.time.elapsed;
  const extra = event.time.extra;
  if (elapsed == null) return null;
  return extra == null ? elapsed : elapsed + extra;
}

function eventInputs(
  events: AfFixtureEvent[],
  teamIdByApiId: Map<number, number>,
): FixtureEventInsertInput[] {
  return events
    .filter((event) => event.type)
    .map((event) => ({
      minute: eventMinute(event),
      type: event.type,
      detail: event.detail,
      teamId: event.team.id == null ? null : teamIdByApiId.get(event.team.id) ?? null,
      playerName: event.player.name,
    }));
}

function eventsForSnapshot(events: LiveFixtureEventSnapshot[]): LiveFixtureEventSnapshot[] {
  return events.map((event) => ({
    minute: event.minute,
    type: event.type,
    detail: event.detail,
    teamId: event.teamId,
    teamName: event.teamName,
    playerName: event.playerName,
  }));
}

async function loadFixtureEventsForSnapshot(fixtureId: number): Promise<LiveFixtureEventSnapshot[]> {
  return eventsForSnapshot(await getFixtureEvents(fixtureId));
}

function slowdownMinuteSkipped(now: Date): boolean {
  return Math.floor(now.getTime() / 60_000) % 2 === 1;
}

function emptyAllSnapshot(
  generatedAt: string,
  apiCallsToday: number,
): LiveAllSnapshot {
  return {
    generatedAt,
    fixtures: [],
    apiCallsToday,
    quotaState: quotaState(apiCallsToday),
  };
}

export async function ingestLiveFixtures(opts: IngestLiveOptions): Promise<IngestLiveResult> {
  const now = opts.now ?? new Date();
  const generatedAt = now.toISOString();
  const season = opts.season ?? 2026;
  const leagueId = opts.leagueId ?? WORLD_CUP_LEAGUE_ID;
  let apiCallsToday = await readApiCallsToday(opts.kv, now);
  let apiCalls = 0;
  let recordedApiCalls = 0;
  let insertedEvents = 0;

  const flushApiCalls = async () => {
    const delta = apiCalls - recordedApiCalls;
    if (delta <= 0) return;
    apiCallsToday += delta;
    recordedApiCalls = apiCalls;
    await writeApiCallsToday(opts.kv, now, apiCallsToday);
  };

  if (apiCallsToday >= STOP_AT) {
    return {
      ok: true,
      skipped: true,
      reason: "quota_stop",
      fixtures: 0,
      events: 0,
      reconciled: 0,
      apiCalls,
      apiCallsToday,
      quotaState: quotaState(apiCallsToday),
    };
  }

  if (apiCallsToday >= SLOWDOWN_AT && slowdownMinuteSkipped(now)) {
    return {
      ok: true,
      skipped: true,
      reason: "quota_slowdown",
      fixtures: 0,
      events: 0,
      reconciled: 0,
      apiCalls,
      apiCallsToday,
      quotaState: quotaState(apiCallsToday),
    };
  }

  const candidates = await getFixturesForLiveIngestWindow(now);
  if (!candidates.length) {
    await writeLiveAll(opts.kv, emptyAllSnapshot(generatedAt, apiCallsToday));
    return {
      ok: true,
      skipped: true,
      reason: "no_window",
      fixtures: 0,
      events: 0,
      reconciled: 0,
      apiCalls,
      apiCallsToday,
      quotaState: quotaState(apiCallsToday),
    };
  }

  const dbFixtureByApiId = new Map(candidates.map((fixture) => [fixture.apiId, fixture]));
  const client = new ApiFootballClient({
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
    fetchImpl: opts.fetchImpl,
    onRequest: () => {
      apiCalls += 1;
    },
  });

  try {
    const liveRes = await client.liveFixtures(leagueId);
    await flushApiCalls();
    const liveFixtures = liveRes.response.filter((fixture) =>
      isWorldCupFixture(fixture, leagueId, season),
    );
    const liveApiIds = new Set(liveFixtures.map((fixture) => fixture.fixture.id));
    const snapshots: LiveFixtureSnapshot[] = [];
    let reconciled = 0;

    const processApiFixture = async (
      apiFixture: AfFixture,
      dbFixture: LiveIngestFixtureView,
    ): Promise<LiveFixtureSnapshot | null> => {
      const summary = toSummary(dbFixture, apiFixture);
      const previous = await readLiveFixture(opts.kv, dbFixture.id);
      const changed = scoreOrStatusChanged(previous, summary);
      let events = previous?.events ?? [];

      await updateLiveFixtureState({
        fixtureId: dbFixture.id,
        status: toLiveStatus(summary.status),
        homeGoals: summary.homeGoals,
        awayGoals: summary.awayGoals,
        elapsed: summary.elapsed,
        raw: apiFixture,
      });

      if (changed && apiCallsToday < STOP_AT) {
        const eventsRes = await client.fixtureEvents(apiFixture.fixture.id);
        await flushApiCalls();
        const teamApiIds = eventsRes.response
          .map((event) => event.team.id)
          .filter((id): id is number => Number.isInteger(id));
        const teamIdByApiId = await getTeamIdsByApiIds(teamApiIds);
        insertedEvents += await insertFixtureEventsDeduped(
          dbFixture.id,
          eventInputs(eventsRes.response, teamIdByApiId),
        );
        events = await loadFixtureEventsForSnapshot(dbFixture.id);
      } else if (!events.length) {
        events = await loadFixtureEventsForSnapshot(dbFixture.id);
      }

      const snapshot: LiveFixtureSnapshot = { generatedAt, fixture: summary, events };
      await writeLiveFixture(opts.kv, snapshot);
      return snapshot;
    };

    for (const apiFixture of liveFixtures) {
      const dbFixture = dbFixtureByApiId.get(apiFixture.fixture.id);
      if (!dbFixture) continue;
      const snapshot = await processApiFixture(apiFixture, dbFixture);
      if (snapshot) snapshots.push(snapshot);
    }

    for (const dbFixture of candidates) {
      if (dbFixture.status !== "live" || liveApiIds.has(dbFixture.apiId) || apiCallsToday >= STOP_AT) {
        continue;
      }
      const detailRes = await client.fixtureById(dbFixture.apiId);
      await flushApiCalls();
      const detailFixture = detailRes.response.find((fixture) =>
        isWorldCupFixture(fixture, leagueId, season),
      );
      if (!detailFixture) continue;
      const detailStatus = mapStatus(detailFixture.fixture.status.short);
      if (detailStatus === "scheduled") continue;
      const snapshot = await processApiFixture(detailFixture, dbFixture);
      if (!snapshot) continue;
      if (snapshot.fixture.status === "live") {
        snapshots.push(snapshot);
      } else {
        reconciled += 1;
      }
    }

    await writeLiveAll(opts.kv, {
      generatedAt,
      fixtures: snapshots.map((snapshot) => snapshot.fixture),
      apiCallsToday,
      quotaState: quotaState(apiCallsToday),
    });

    return {
      ok: true,
      skipped: false,
      fixtures: snapshots.length,
      events: insertedEvents,
      reconciled,
      apiCalls,
      apiCallsToday,
      quotaState: quotaState(apiCallsToday),
    };
  } catch (error) {
    await flushApiCalls();
    if (error instanceof ApiFootballError && error.status === 429) {
      return {
        ok: false,
        skipped: true,
        reason: "rate_limited",
        fixtures: 0,
        events: insertedEvents,
        reconciled: 0,
        apiCalls,
        apiCallsToday,
        quotaState: "stopped",
      };
    }
    throw error;
  }
}
