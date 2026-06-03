import { json, parsePositiveInt } from "@/lib/api/http";
import { renderMarkdown } from "@/lib/markdown";
import { getRuntimeArticlesForFixture } from "@/lib/runtime-data";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const fixtureId = parsePositiveInt((await params).fixtureId);
  if (!fixtureId) return json({ authorized: false }, { status: 400 });

  const user = await getSessionUser().catch(() => null);
  if (!user) return json({ authorized: false });

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "id";
  const articles = await getRuntimeArticlesForFixture(fixtureId, locale).catch(() => []);
  const prediction = articles.find((a) => a.type === "prediction");
  if (!prediction) return json({ authorized: false });

  return json({
    authorized: true,
    html: renderMarkdown(prediction.body, { headingOffset: 2 }),
  });
}
