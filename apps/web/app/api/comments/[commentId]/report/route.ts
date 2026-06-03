import { headers } from "next/headers";
import { json, parsePositiveInt, readJson } from "@/lib/api/http";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { reportRuntimeComment } from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

type ReportBody = {
  reason?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const commentId = parsePositiveInt((await params).commentId);
  if (!commentId) return json({ ok: false }, { status: 400 });

  const input = await readJson<ReportBody>(request);
  const user = await getSessionUser().catch(() => null);
  const ip = clientIp(await headers());
  const rl = await rateLimit(`report:${user?.id ?? ip}`, 10, 60);
  if (!rl.success) return json({ ok: false });

  await reportRuntimeComment(commentId, user?.id ?? null, input?.reason).catch(() => {});
  return json({ ok: true });
}
