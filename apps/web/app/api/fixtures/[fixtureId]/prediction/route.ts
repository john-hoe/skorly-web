import { json, parsePositiveInt, readJson } from "@/lib/api/http";
import {
  getRuntimePrediction,
  upsertRuntimePrediction,
} from "@/lib/runtime-data";
import { rateLimit } from "@/lib/ratelimit";
import { getSessionUser } from "@/lib/supabase/server";

type PredictionBody = {
  home?: number;
  away?: number;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const fixtureId = parsePositiveInt((await params).fixtureId);
  if (!fixtureId) return json({ auth: false }, { status: 400 });

  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ auth: false });

  const prediction = await getRuntimePrediction(user.id, fixtureId).catch(() => null);
  return json({ auth: true, prediction });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const fixtureId = parsePositiveInt((await params).fixtureId);
  const body = await readJson<PredictionBody>(request);
  const home = Number(body?.home);
  const away = Number(body?.away);
  if (!fixtureId || !Number.isInteger(home) || !Number.isInteger(away)) {
    return json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  const rl = await rateLimit(`predict:${user.id}`, 60, 60);
  if (!rl.success) return json({ ok: false, error: "rateLimited" });

  const res = await upsertRuntimePrediction(user.id, fixtureId, home, away).catch(() => ({
    ok: false as const,
    reason: "generic" as const,
  }));
  if (!res.ok) {
    return json({
      ok: false,
      error:
        res.reason === "locked"
          ? "locked"
          : res.reason === "invalid"
            ? "invalid"
            : "generic",
    });
  }
  return json({ ok: true, home, away });
}
