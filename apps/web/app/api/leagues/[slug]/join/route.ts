import { json } from "@/lib/api/http";
import { joinRuntimeMiniLeague } from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ ok: false, error: "unauth" });

  const slug = (await params).slug;
  const res = await joinRuntimeMiniLeague(slug, user.id).catch(() => null);
  if (!res) return json({ ok: false, error: "generic" });
  if (!res.ok) return json({ ok: false, error: "notFound" });
  return json({ ok: true, alreadyMember: res.alreadyMember });
}
