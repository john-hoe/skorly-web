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
import { localizedSitePath } from "@skorly/types";

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

function kickoffBody(locale: string): string {
  switch (locale) {
    case "id":
      return "Kickoff! ⚽";
    case "vi":
      return "Bóng lăn! ⚽";
    case "zh":
      return "比赛开始！⚽";
    case "th":
      return "เริ่มแข่งแล้ว! ⚽";
    default:
      return "Kickoff! ⚽";
  }
}

function resultTitle(locale: string, points: number): string {
  if (points > 0) return `🎯 +${points} pts!`;
  switch (locale) {
    case "id":
      return "Hasil pertandingan";
    case "vi":
      return "Kết quả trận đấu";
    case "zh":
      return "比赛结果";
    case "th":
      return "ผลการแข่งขัน";
    default:
      return "Match result";
  }
}

function resultBody(
  locale: string,
  match: string,
  actual: string,
  pick: string,
): string {
  switch (locale) {
    case "id":
      return `${match} ${actual} · tebakanmu ${pick}`;
    case "vi":
      return `${match} ${actual} · bạn dự đoán ${pick}`;
    case "zh":
      return `${match} ${actual} · 你的预测 ${pick}`;
    case "th":
      return `${match} ${actual} · คุณทาย ${pick}`;
    default:
      return `${match} ${actual} · you picked ${pick}`;
  }
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
            body: kickoffBody(locale),
            url: `${base}${localizedSitePath(locale, "match", { slug: k.slug })}`,
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
            url: `${base}${localizedSitePath(locale, "match", { slug: g.slug })}`,
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
              title: resultTitle(locale, r.pointsAwarded),
              body: resultBody(
                locale,
                `${r.homeName} vs ${r.awayName}`,
                `${r.homeGoals ?? ""}-${r.awayGoals ?? ""}`,
                `${r.homeGoalsPred}-${r.awayGoalsPred}`,
              ),
              url: `${base}${localizedSitePath(locale, "match", { slug: r.slug })}`,
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
