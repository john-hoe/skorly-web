import { json, parsePositiveInt } from "@/lib/api/http";
import { rateLimit } from "@/lib/ratelimit";
import { toggleRuntimeCommentLike } from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const commentId = parsePositiveInt((await params).commentId);
  if (!commentId) return json({ ok: false }, { status: 400 });

  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false });

  const rl = await rateLimit(`like:${user.id}`, 30, 60);
  if (!rl.success) return json({ ok: false });

  const liked = await toggleRuntimeCommentLike(commentId, user.id).catch(() => null);
  if (liked == null) return json({ ok: false });
  return json({ ok: true, liked });
}
