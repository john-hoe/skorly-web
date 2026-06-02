import { getDb, articles } from "@skorly/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  const byLocale = await db
    .select({
      locale: articles.locale,
      status: articles.status,
      count: sql<number>`count(*)::int`,
    })
    .from(articles)
    .groupBy(articles.locale, articles.status)
    .orderBy(articles.locale);
  console.table(byLocale);

  const groups = await db
    .select({
      groupName: articles.groupName,
      count: sql<number>`count(*)::int`,
    })
    .from(articles)
    .where(sql`${articles.status} = 'published'`)
    .groupBy(articles.groupName)
    .orderBy(articles.groupName);
  console.log("published per group:");
  console.table(groups);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
