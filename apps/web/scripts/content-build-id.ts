import { createHash } from "node:crypto";
import { getAllFixtures } from "@skorly/db";

async function main() {
  const fixtures = await getAllFixtures();
  const key = fixtures
    .map((fixture) =>
      [
        fixture.slug,
        fixture.kickoffAt?.toISOString() ?? "",
        fixture.status,
        fixture.homeTeamId ?? "",
        fixture.awayTeamId ?? "",
      ].join(":")
    )
    .join("|");

  process.stdout.write(createHash("sha256").update(key).digest("hex").slice(0, 10));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
