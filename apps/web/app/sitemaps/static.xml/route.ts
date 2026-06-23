import { buildSitemapXml, sitemapXmlResponse, staticSitemapEntries } from "@/lib/sitemap";

export const dynamic = "force-static";

export function GET() {
  return sitemapXmlResponse(buildSitemapXml(staticSitemapEntries()));
}
