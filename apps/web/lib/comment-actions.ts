"use server";

import { headers } from "next/headers";
import {
  getComments,
  addComment,
  toggleCommentLike,
  reportComment,
  type CommentView,
  type CommentTarget,
} from "@skorly/db";
import { getSessionUser } from "./supabase/server";
import { rateLimit, clientIp } from "./ratelimit";
import { verifyTurnstile } from "./turnstile";
import { screenComment, type FilterReason } from "./comment-filter";

export type CommentThread = {
  auth: boolean;
  comments: CommentView[];
};

/** Load the visible thread for a target (article or fixture). */
export async function loadComments(target: CommentTarget): Promise<CommentThread> {
  const user = await getSessionUser().catch(() => null);
  const comments = await getComments(target, user?.id).catch(() => []);
  return { auth: !!user, comments };
}

export type PostCommentResult =
  | { ok: true }
  | {
      ok: false;
      error: "unauth" | "rateLimited" | "captcha" | "invalid" | FilterReason | "generic";
    };

/** Post a comment / 1-level reply with auth + Turnstile + rate limit + filter. */
export async function postComment(input: {
  target: CommentTarget;
  body: string;
  parentId?: number | null;
  turnstileToken?: string | null;
}): Promise<PostCommentResult> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { ok: false, error: "unauth" };

  const ip = clientIp(await headers());
  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return { ok: false, error: "captcha" };
  }

  // 5 comments / minute / user, plus an IP guard against scripted floods.
  const [u, i] = await Promise.all([
    rateLimit(`comment:u:${user.id}`, 5, 60),
    rateLimit(`comment:ip:${ip}`, 15, 60),
  ]);
  if (!u.success || !i.success) return { ok: false, error: "rateLimited" };

  const screen = screenComment(input.body);
  if (!screen.ok) return { ok: false, error: screen.reason ?? "invalid" };

  const res = await addComment({
    userId: user.id,
    target: input.target,
    body: input.body,
    parentId: input.parentId ?? null,
  }).catch(() => null);
  if (!res || !res.ok) return { ok: false, error: "invalid" };
  return { ok: true };
}

export type LikeResult = { ok: true; liked: boolean } | { ok: false };

/** Toggle a like on a comment for the signed-in user. */
export async function likeComment(commentId: number): Promise<LikeResult> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return { ok: false };
  const rl = await rateLimit(`like:${user.id}`, 30, 60);
  if (!rl.success) return { ok: false };
  const liked = await toggleCommentLike(commentId, user.id).catch(() => null);
  if (liked == null) return { ok: false };
  return { ok: true, liked };
}

/** Report a comment (auto-hidden once it crosses the threshold server-side). */
export async function flagComment(commentId: number, reason?: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser().catch(() => null);
  const ip = clientIp(await headers());
  const rl = await rateLimit(`report:${user?.id ?? ip}`, 10, 60);
  if (!rl.success) return { ok: false };
  await reportComment(commentId, user?.id ?? null, reason).catch(() => {});
  return { ok: true };
}
