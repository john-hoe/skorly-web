import type {
  RuntimeBracketPicks,
  RuntimeCommentTargetInput,
  RuntimeCommentView,
  RuntimeFixtureEventView,
  RuntimeMatchForecastView,
  RuntimePredictionView,
  RuntimePublicPick,
  RuntimePushKeys,
  RuntimePushTopics,
  RuntimeTeamGroup,
} from "./runtime-data";
import type { ScoreRow } from "./score-types";

type JsonInit = Omit<RequestInit, "body"> & { body?: unknown };

async function apiJson<T>(url: string, init: JsonInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
    body: init.body == null ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`API ${init.method ?? "GET"} ${url} failed with ${res.status}`);
  return (await res.json()) as T;
}

export type HomePersonalization =
  | { auth: false }
  | {
      auth: true;
      points: number;
      rank: number | null;
      scored: number;
      nextMatch: { slug: string; home: string; away: string } | null;
    };

export type MyPredictionResult =
  | { auth: false }
  | { auth: true; prediction: RuntimePredictionView | null };

export type SubmitPredictionResult =
  | { ok: true; home: number; away: number }
  | { ok: false; error: "unauth" | "locked" | "invalid" | "rateLimited" | "generic" };

export type CommentThread = {
  auth: boolean;
  comments: RuntimeCommentView[];
};

export type PostCommentResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauth"
        | "rateLimited"
        | "captcha"
        | "invalid"
        | "link"
        | "gambling"
        | "piracy"
        | "generic";
    };

export type LikeResult = { ok: true; liked: boolean } | { ok: false };

export type GetBracketResult =
  | { ok: true; bracket: RuntimeBracketPicks | null }
  | { ok: false; error: "unauth" | "generic" };

export type SaveBracketResult =
  | { ok: true }
  | { ok: false; error: "unauth" | "invalid" | "rateLimited" | "generic" };

export type CreateLeagueResult =
  | { ok: true; slug: string }
  | { ok: false; error: "unauth" | "invalid" | "rateLimited" | "generic" };

export type JoinLeagueResult =
  | { ok: true; alreadyMember: boolean }
  | { ok: false; error: "unauth" | "notFound" | "generic" };

export interface BrowserSubscription {
  endpoint: string;
  keys: RuntimePushKeys;
}

export type SubscribePushResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rateLimited" | "generic" };

export type PremiumArticleResult =
  | { authorized: true; html: string }
  | { authorized: false };

export function getForecastApi(fixtureId: number) {
  return apiJson<RuntimeMatchForecastView | null>(`/api/fixtures/${fixtureId}/forecast`);
}

export function getPicksApi(fixtureId: number) {
  return apiJson<RuntimePublicPick[]>(`/api/fixtures/${fixtureId}/picks`);
}

export function getMyPredictionApi(fixtureId: number) {
  return apiJson<MyPredictionResult>(`/api/fixtures/${fixtureId}/prediction`);
}

export function submitPredictionApi(fixtureId: number, home: number, away: number) {
  return apiJson<SubmitPredictionResult>(`/api/fixtures/${fixtureId}/prediction`, {
    method: "POST",
    body: { home, away },
  });
}

export function getEventsApi(fixtureId: number) {
  return apiJson<RuntimeFixtureEventView[]>(`/api/fixtures/${fixtureId}/events`);
}

export function getLiveScoresApi() {
  return apiJson<ScoreRow[]>("/api/score/live");
}

export function getHomePersonalizationApi() {
  return apiJson<HomePersonalization>("/api/home/personalization");
}

export function getTeamGroupsApi() {
  return apiJson<RuntimeTeamGroup[]>("/api/teams/groups");
}

export function getPremiumArticleApi(fixtureId: number, locale: string) {
  const params = new URLSearchParams({ locale });
  return apiJson<PremiumArticleResult>(`/api/fixtures/${fixtureId}/premium?${params}`);
}

export function loadCommentsApi(target: RuntimeCommentTargetInput) {
  const params = new URLSearchParams();
  if ("fixtureId" in target) params.set("fixtureId", String(target.fixtureId));
  if ("articleId" in target) params.set("articleId", String(target.articleId));
  return apiJson<CommentThread>(`/api/comments?${params}`);
}

export function postCommentApi(input: {
  target: RuntimeCommentTargetInput;
  body: string;
  parentId?: number | null;
  turnstileToken?: string | null;
}) {
  return apiJson<PostCommentResult>("/api/comments", {
    method: "POST",
    body: input,
  });
}

export function likeCommentApi(commentId: number) {
  return apiJson<LikeResult>(`/api/comments/${commentId}/like`, { method: "POST" });
}

export function flagCommentApi(commentId: number, reason?: string) {
  return apiJson<{ ok: boolean }>(`/api/comments/${commentId}/report`, {
    method: "POST",
    body: { reason },
  });
}

export function getBracketApi() {
  return apiJson<GetBracketResult>("/api/bracket");
}

export function saveBracketApi(picks: RuntimeBracketPicks) {
  return apiJson<SaveBracketResult>("/api/bracket", { method: "POST", body: picks });
}

export function createLeagueApi(name: string) {
  return apiJson<CreateLeagueResult>("/api/leagues", { method: "POST", body: { name } });
}

export function joinLeagueApi(slug: string) {
  return apiJson<JoinLeagueResult>(`/api/leagues/${encodeURIComponent(slug)}/join`, {
    method: "POST",
  });
}

export function subscribePushApi(
  sub: BrowserSubscription,
  opts?: { locale?: string; topics?: RuntimePushTopics },
) {
  return apiJson<SubscribePushResult>("/api/push/subscribe", {
    method: "POST",
    body: { subscription: sub, options: opts },
  });
}

export function unsubscribePushApi(endpoint: string) {
  return apiJson<{ ok: boolean }>("/api/push/unsubscribe", {
    method: "POST",
    body: { endpoint },
  });
}
