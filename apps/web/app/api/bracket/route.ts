import { json, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/ratelimit";
import {
  getRuntimeBracket,
  saveRuntimeBracket,
  type RuntimeBracketPicks,
} from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  try {
    return json({ ok: true, bracket: await getRuntimeBracket(user.id) });
  } catch {
    return json({ ok: false, error: "generic" });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  const picks = await readJson<RuntimeBracketPicks>(request);
  if (!picks) return json({ ok: false, error: "invalid" }, { status: 400 });

  try {
    const rl = await rateLimit(`bracket:${user.id}`, 30, 60);
    if (!rl.success) return json({ ok: false, error: "rateLimited" });

    const res = await saveRuntimeBracket(user.id, picks);
    if (res.ok) return json({ ok: true });
    return json({ ok: false, error: res.reason === "invalid" ? "invalid" : "generic" });
  } catch {
    return json({ ok: false, error: "generic" });
  }
}
