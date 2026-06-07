import { getAllFixtures } from "@skorly/db";

type Fixtures = Awaited<ReturnType<typeof getAllFixtures>>;

let staticFixturesPromise: Promise<Fixtures> | undefined;

export function getStaticFixturesForBuild(): Promise<Fixtures> {
  staticFixturesPromise ??= getAllFixtures().catch(() => []);
  return staticFixturesPromise;
}
