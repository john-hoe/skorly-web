import type { FixtureView } from "@skorly/db";

/** Serializable score row for client islands (Date → ISO string). */
export interface ScoreRow {
  id: number;
  slug: string;
  status: string;
  elapsed: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  kickoff: string | null;
  groupName: string | null;
  round: string | null;
  home: { name: string; code: string | null; logo: string | null };
  away: { name: string; code: string | null; logo: string | null };
}

export function toScoreRow(f: FixtureView): ScoreRow {
  return {
    id: f.id,
    slug: f.slug,
    status: f.status,
    elapsed: f.elapsed,
    homeGoals: f.homeGoals,
    awayGoals: f.awayGoals,
    kickoff: f.kickoffAt ? f.kickoffAt.toISOString() : null,
    groupName: f.groupName,
    round: f.round,
    home: { name: f.home.name, code: f.home.code, logo: f.home.logo },
    away: { name: f.away.name, code: f.away.code, logo: f.away.logo },
  };
}
