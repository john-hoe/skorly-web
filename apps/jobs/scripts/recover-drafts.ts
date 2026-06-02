/**
 * Re-gate existing DRAFT articles after the back-translate fix.
 * Many drafts scored >=8 but were wrongly failed by the strict entity check
 * (e.g. "Congo DR" vs back-translated "DR Congo"). This re-runs ONLY the
 * back-translation on the stored body and publishes those that now pass —
 * reusing good content instead of regenerating.
 *
 * Usage: pnpm tsx --env-file=.env apps/jobs/scripts/recover-drafts.ts
 */
import {
  getDraftArticles,
  getFixtureTeamNames,
  getStandingsByGroup,
  publishArticleById,
} from "@skorly/db";
import { backTranslateCheck } from "@skorly/ai-content";

const THRESHOLD = 8;
const CONCURRENCY = 4;

async function entitiesFor(d: {
  fixtureId: number | null;
  groupName: string | null;
}): Promise<string[]> {
  if (d.fixtureId) return getFixtureTeamNames(d.fixtureId);
  if (d.groupName) {
    const st = await getStandingsByGroup(d.groupName);
    return st.map((s) => s.team.name).filter(Boolean);
  }
  return [];
}

async function pool<T>(items: T[], fn: (x: T) => Promise<void>, n: number) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) await fn(queue.shift()!);
    })
  );
}

async function main() {
  const drafts = await getDraftArticles();
  console.log(`${drafts.length} draft articles to re-gate.`);

  let published = 0;
  let kept = 0;
  let skippedLowScore = 0;

  await pool(
    drafts,
    async (d) => {
      // Only recover drafts that already scored >= threshold; genuinely
      // low-quality ones stay as drafts.
      if (d.qualityScore != null && d.qualityScore < THRESHOLD) {
        skippedLowScore++;
        return;
      }
      const entities = await entitiesFor(d);
      const bt = await backTranslateCheck(d.body, entities).catch(() => null);
      if (bt && bt.ok) {
        await publishArticleById(d.id);
        published++;
        console.log(`  [published] #${d.id} ${d.locale}/${d.type}`);
      } else {
        kept++;
        if (bt) console.log(`  [keep draft] #${d.id} ${d.locale}/${d.type} missing: ${bt.missing.join(", ")}`);
      }
    },
    CONCURRENCY
  );

  console.log(
    `\nDone. published=${published}, kept_draft=${kept}, skipped_lowscore=${skippedLowScore}`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("recover-drafts failed:", e);
  process.exit(1);
});
