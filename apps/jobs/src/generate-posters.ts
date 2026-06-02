/**
 * 二期 M6 — enqueue GPT-Image poster prompts by fixture lifecycle.
 *
 * Pre-match (kickoff within N hours): a versus poster. Post-match (finished):
 * a result card. We only ENQUEUE prompts here (status=pending) — the heavy
 * GPT-Image generation + watermark + upload is run by the local image skill,
 * which fills the URL and flips status=ready. Idempotent: one row per
 * (fixture, kind, variant) via a unique index.
 */
import {
  getFixturesNeedingPrematchPoster,
  getFixturesNeedingResultCard,
  getTeamIdentity,
  enqueuePoster,
  type PosterCandidate,
  type TeamIdentityRow,
} from "@skorly/db";
import {
  buildPrematchPoster,
  buildResultCard,
  type PosterVariant,
  type TeamIdentityInput,
} from "@skorly/ai-content";

function readEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  );
}

function variant(): PosterVariant {
  const v = readEnv().POSTER_VARIANT;
  return v === "star" || v === "totem" || v === "silhouette" ? v : "star";
}

function toInput(name: string, id: TeamIdentityRow | null): TeamIdentityInput {
  return {
    name,
    alias: id?.alias,
    totemAnimal: id?.totemAnimal,
    primaryColor: id?.primaryColor,
    secondaryColor: id?.secondaryColor,
    flagEmoji: id?.flagEmoji,
    starPlayer: id?.starPlayer,
    starNumber: id?.starNumber,
  };
}

async function identitiesFor(c: PosterCandidate) {
  const [home, away] = await Promise.all([
    c.homeTeamId != null ? getTeamIdentity(c.homeTeamId).catch(() => null) : null,
    c.awayTeamId != null ? getTeamIdentity(c.awayTeamId).catch(() => null) : null,
  ]);
  return {
    home: toInput(c.homeName, home),
    away: toInput(c.awayName, away),
  };
}

export async function generatePosters(): Promise<{ prematch: number; result: number }> {
  const v = variant();
  let prematch = 0;
  let result = 0;

  const upcoming = await getFixturesNeedingPrematchPoster(24).catch(() => []);
  for (const c of upcoming) {
    const { home, away } = await identitiesFor(c);
    const prompt = buildPrematchPoster(home, away, v);
    await enqueuePoster({
      fixtureId: c.fixtureId,
      kind: "prematch_poster",
      variant: v,
      prompt,
    }).catch(() => {});
    prematch++;
  }

  const finished = await getFixturesNeedingResultCard().catch(() => []);
  for (const c of finished) {
    if (c.homeGoals == null || c.awayGoals == null) continue;
    const { home, away } = await identitiesFor(c);
    const prompt = buildResultCard(home, away, c.homeGoals, c.awayGoals, v);
    await enqueuePoster({
      fixtureId: c.fixtureId,
      kind: "result_card",
      variant: v,
      prompt,
    }).catch(() => {});
    result++;
  }

  return { prematch, result };
}
