import { getAllTeamSlugs } from "@skorly/db";
import { buildSitemapXml, sitemapXmlResponse, teamSitemapEntries } from "@/lib/sitemap";

export const dynamic = "force-static";

export async function GET() {
  const teamSlugs = await getAllTeamSlugs().catch(() => []);
  return sitemapXmlResponse(buildSitemapXml(teamSitemapEntries(teamSlugs)));
}
