import { headers } from "next/headers";
import { json, readJson } from "@/lib/api/http";
import { analyticsIdentityFromCookieHeader } from "@/lib/analytics";
import { trackServerAfter } from "@/lib/analytics-server";
import { screenComment } from "@/lib/comment-filter";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import {
  addRuntimeComment,
  getRuntimeComments,
  type RuntimeCommentTargetInput,
} from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

type PostBody = {
  target?: RuntimeCommentTargetInput;
  body?: string;
  parentId?: number | null;
  turnstileToken?: string | null;
};

function parseTargetFromUrl(request: Request): RuntimeCommentTargetInput | null {
  const { searchParams } = new URL(request.url);
  const fixtureId = Number(searchParams.get("fixtureId"));
  if (Number.isInteger(fixtureId) && fixtureId > 0) return { fixtureId };
  const articleId = Number(searchParams.get("articleId"));
  if (Number.isInteger(articleId) && articleId > 0) return { articleId };
  return null;
}

function validTarget(target: unknown): target is RuntimeCommentTargetInput {
  if (!target || typeof target !== "object") return false;
  if ("fixtureId" in target) {
    const fixtureId = Number((target as { fixtureId?: unknown }).fixtureId);
    return Number.isInteger(fixtureId) && fixtureId > 0;
  }
  if ("articleId" in target) {
    const articleId = Number((target as { articleId?: unknown }).articleId);
    return Number.isInteger(articleId) && articleId > 0;
  }
  return false;
}

function analyticsTarget(target: RuntimeCommentTargetInput): {
  targetType: "article" | "prediction";
  targetId: string;
} {
  if ("articleId" in target) {
    return { targetType: "article", targetId: String(target.articleId) };
  }
  return { targetType: "prediction", targetId: String(target.fixtureId) };
}

export async function GET(request: Request) {
  const target = parseTargetFromUrl(request);
  if (!target) return json({ auth: false, comments: [] }, { status: 400 });

  const user = await getSessionUser().catch(() => null);
  const comments = await getRuntimeComments(target, user?.id).catch(() => []);
  return json({ auth: !!user, comments });
}

export async function POST(request: Request) {
  const input = await readJson<PostBody>(request);
  if (!input || !validTarget(input.target)) {
    return json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  const h = await headers();
  const ip = clientIp(h);
  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return json({ ok: false, error: "captcha" });
  }

  const [u, i] = await Promise.all([
    rateLimit(`comment:u:${user.id}`, 5, 60),
    rateLimit(`comment:ip:${ip}`, 15, 60),
  ]);
  if (!u.success || !i.success) return json({ ok: false, error: "rateLimited" });

  const screen = screenComment(input.body ?? "");
  if (!screen.ok) return json({ ok: false, error: screen.reason ?? "invalid" });

  const res = await addRuntimeComment({
    userId: user.id,
    target: input.target,
    body: input.body ?? "",
    parentId: input.parentId ?? null,
  }).catch(() => null);
  if (!res?.ok) return json({ ok: false, error: "invalid" });
  const analytics = analyticsIdentityFromCookieHeader(request.headers.get("cookie"), user.id);
  trackServerAfter(
    "comment_post",
    analytics.distinctId,
    analyticsTarget(input.target),
    {
      consentGranted: analytics.consentGranted,
      userId: user.id,
      userAgent: request.headers.get("user-agent"),
      url: request.url,
    },
  );
  return json({ ok: true });
}
