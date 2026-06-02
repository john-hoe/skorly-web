/**
 * M3 — dispatch Web Push notifications for kickoff, goals and prediction
 * results. Idempotent: each source row is marked notified after a successful
 * (or permanently-failed) send so reruns don't double-notify. Subscriptions
 * that return 404/410 are pruned.
 */
import {
  getKickoffsToNotify,
  markFixtureKickoffNotified,
  getGoalsToNotify,
  markEventNotified,
  getPredictionResultsToNotify,
  markPredictionResultNotified,
  getPushTargetsForTopic,
  getPushTargetsForUser,
  markPushSent,
  recordPushFailure,
  deletePushSubscription,
  type PushTarget,
} from "@skorly/db";
import { sendPush, type VapidConfig } from "./web-push";

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Read hydrated env (jobs copies Worker env into process.env at request time). */
function readEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  );
}

function vapidFromEnv(): VapidConfig | null {
  const env = readEnv();
  const publicKey = env.VAPID_PUBLIC_KEY ?? env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT ?? "mailto:business@skorly.cc";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function siteUrl(): string {
  return (readEnv().SITE_URL ?? "https://skorly.cc").replace(/\/$/, "");
}

/** Deliver one payload to a list of targets; returns delivered count. */
async function fanOut(
  targets: PushTarget[],
  build: (locale: string) => PushPayload,
  vapid: VapidConfig,
): Promise<number> {
  let delivered = 0;
  for (const t of targets) {
    const payload = build(t.locale || "id");
    const res = await sendPush(t, payload, vapid).catch(() => ({
      ok: false as const,
      status: 0,
      gone: false,
    }));
    if (res.ok) {
      delivered++;
      await markPushSent(t.endpoint).catch(() => {});
    } else if (res.gone) {
      await deletePushSubscription(t.endpoint).catch(() => {});
    } else {
      await recordPushFailure(t.endpoint).catch(() => {});
    }
  }
  return delivered;
}

export async function sendNotifications(): Promise<{
  kickoff: number;
  goals: number;
  results: number;
}> {
  const vapid = vapidFromEnv();
  if (!vapid) {
    console.warn("[notify] VAPID keys missing — skipping push dispatch");
    return { kickoff: 0, goals: 0, results: 0 };
  }
  const base = siteUrl();
  const out = { kickoff: 0, goals: 0, results: 0 };

  // 1) Kickoff — broadcast to the "kickoff" topic.
  const kickoffs = await getKickoffsToNotify().catch(() => []);
  if (kickoffs.length) {
    const targets = await getPushTargetsForTopic("kickoff").catch(() => []);
    for (const k of kickoffs) {
      if (targets.length) {
        out.kickoff += await fanOut(
          targets,
          (locale) => ({
            title: `${k.homeName} vs ${k.awayName}`,
            body: "Kickoff! ⚽",
            url: `${base}/${locale}/pertandingan/${k.slug}`,
            tag: `kickoff-${k.fixtureId}`,
          }),
          vapid,
        );
      }
      await markFixtureKickoffNotified(k.fixtureId).catch(() => {});
    }
  }

  // 2) Goals — broadcast to the "goals" topic.
  const goals = await getGoalsToNotify().catch(() => []);
  if (goals.length) {
    const targets = await getPushTargetsForTopic("goals").catch(() => []);
    for (const g of goals) {
      if (targets.length) {
        const score =
          g.homeGoals != null && g.awayGoals != null ? ` (${g.homeGoals}-${g.awayGoals})` : "";
        const who = g.scorer ? `${g.scorer}` : (g.teamName ?? "Goal");
        out.goals += await fanOut(
          targets,
          (locale) => ({
            title: `⚽ ${g.homeName} ${g.homeGoals ?? ""}-${g.awayGoals ?? ""} ${g.awayName}`.trim(),
            body: `${g.minute ? g.minute + "' " : ""}${who}${score}`,
            url: `${base}/${locale}/pertandingan/${g.slug}`,
            tag: `goal-${g.fixtureId}`,
          }),
          vapid,
        );
      }
      await markEventNotified(g.eventId).catch(() => {});
    }
  }

  // 3) Prediction results — per-user, only those who opted into the result topic.
  const results = await getPredictionResultsToNotify().catch(() => []);
  if (results.length) {
    const notified: number[] = [];
    const byUser = new Map<string, typeof results>();
    for (const r of results) {
      const arr = byUser.get(r.userId) ?? [];
      arr.push(r);
      byUser.set(r.userId, arr);
    }
    for (const [userId, rows] of byUser) {
      const targets = await getPushTargetsForUser(userId).catch(() => []);
      if (targets.length) {
        for (const r of rows) {
          const hit = r.pointsAwarded > 0;
          out.results += await fanOut(
            targets,
            (locale) => ({
              title: hit ? `🎯 +${r.pointsAwarded} pts!` : "Match result",
              body: `${r.homeName} ${r.homeGoals ?? ""}-${r.awayGoals ?? ""} ${r.awayName} · you picked ${r.homeGoalsPred}-${r.awayGoalsPred}`,
              url: `${base}/${locale}/pertandingan/${r.slug}`,
              tag: `result-${r.predictionId}`,
            }),
            vapid,
          );
        }
      }
      for (const r of rows) notified.push(r.predictionId);
    }
    await markPredictionResultNotified(notified).catch(() => {});
  }

  return out;
}
