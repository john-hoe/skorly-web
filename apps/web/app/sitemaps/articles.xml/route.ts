import { getArticleSitemapEntries } from "@skorly/db";
import { articleSitemapEntries, buildSitemapXml, sitemapXmlResponse } from "@/lib/sitemap";

export const dynamic = "force-static";

export async function GET() {
  const articles = await getArticleSitemapEntries().catch(() => []);
  return sitemapXmlResponse(buildSitemapXml(articleSitemapEntries(articles)));
}
