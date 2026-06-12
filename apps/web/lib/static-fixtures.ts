import { getAllFixtures } from "@skorly/db";
import { withBuildRetry } from "@/lib/build-retry";

type Fixtures = Awaited<ReturnType<typeof getAllFixtures>>;

let staticFixturesPromise: Promise<Fixtures> | undefined;

/**
 * Fixture list shared by match pages, web stories and the sitemap at build
 * time. With dynamicParams=false on those routes, a swallowed transient DB
 * failure here would generate ZERO match pages (every match URL 404s until
 * the next deploy) — so retry, then fail the build loudly on empty data.
 */
export function getStaticFixturesForBuild(): Promise<Fixtures> {
  staticFixturesPromise ??= withBuildRetry("static-fixtures:getAllFixtures", () =>
    getAllFixtures(),
  ).then((fixtures) => {
    if (fixtures.length === 0) {
      throw new Error("[static-fixtures] getAllFixtures returned 0 rows at build time");
    }
    return fixtures;
  });
  return staticFixturesPromise;
}
