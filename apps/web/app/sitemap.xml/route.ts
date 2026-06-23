import { buildSitemapIndexXml, sitemapIndexEntries, sitemapXmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export function GET() {
  return sitemapXmlResponse(buildSitemapIndexXml(sitemapIndexEntries()));
}
