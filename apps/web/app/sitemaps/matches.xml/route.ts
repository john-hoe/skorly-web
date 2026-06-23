import { getStaticFixturesForBuild } from "@/lib/static-fixtures";
import { buildSitemapXml, matchSitemapEntries, sitemapXmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export async function GET() {
  const fixtures = await getStaticFixturesForBuild();
  return sitemapXmlResponse(buildSitemapXml(matchSitemapEntries(fixtures)));
}
