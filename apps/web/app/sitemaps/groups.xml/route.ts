import { getGroupNames } from "@skorly/db";
import { buildSitemapXml, groupSitemapEntries, sitemapXmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export async function GET() {
  const groups = await getGroupNames().catch(() => []);
  return sitemapXmlResponse(buildSitemapXml(groupSitemapEntries(groups)));
}
