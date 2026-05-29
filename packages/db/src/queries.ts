import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "./client";
import { fixtures, teams, articles, standings } from "./schema";

const homeTeam = () => alias(teams, "home_team");
const awayTeam = () => alias(teams, "away_team");

export interface FixtureView {
  id: number;
  slug: string;
  round: string | null;
  groupName: string | null;
  stage: string | null;
  kickoffAt: Date | null;
  venue: string | null;
  city: string | null;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  elapsed: number | null;
  home: { name: string; slug: string; logo: string | null; code: string | null };
  away: { name: string; slug: string; logo: string | null; code: string | null };
}

function fixtureSelect(home: ReturnType<typeof homeTeam>, away: ReturnType<typeof awayTeam>) {
  return {
    id: fixtures.id,
    slug: fixtures.slug,
    round: fixtures.round,
    groupName: fixtures.groupName,
    stage: fixtures.stage,
    kickoffAt: fixtures.kickoffAt,
    venue: fixtures.venue,
    city: fixtures.city,
    status: fixtures.status,
    homeGoals: fixtures.homeGoals,
    awayGoals: fixtures.awayGoals,
    elapsed: fixtures.elapsed,
    homeName: home.name,
    homeSlug: home.slug,
    homeLogo: home.logo,
    homeCode: home.code,
    awayName: away.name,
    awaySlug: away.slug,
    awayLogo: away.logo,
    awayCode: away.code,
  };
}

type Row = Record<string, unknown>;
function toView(r: Row): FixtureView {
  return {
    id: r.id as number,
    slug: r.slug as string,
    round: r.round as string | null,
    groupName: r.groupName as string | null,
    stage: r.stage as string | null,
    kickoffAt: r.kickoffAt as Date | null,
    venue: r.venue as string | null,
    city: r.city as string | null,
    status: r.status as string,
    homeGoals: r.homeGoals as number | null,
    awayGoals: r.awayGoals as number | null,
    elapsed: r.elapsed as number | null,
    home: {
      name: (r.homeName as string) ?? "TBD",
      slug: (r.homeSlug as string) ?? "",
      logo: r.homeLogo as string | null,
      code: r.homeCode as string | null,
    },
    away: {
      name: (r.awayName as string) ?? "TBD",
      slug: (r.awaySlug as string) ?? "",
      logo: r.awayLogo as string | null,
      code: r.awayCode as string | null,
    },
  };
}

/** Upcoming fixtures ordered by kickoff. */
export async function getUpcomingFixtures(limit = 8): Promise<FixtureView[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select(fixtureSelect(home, away))
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(gte(fixtures.kickoffAt, sql`now() - interval '3 hours'`))
    .orderBy(asc(fixtures.kickoffAt))
    .limit(limit);
  return rows.map(toView);
}

/** All fixtures (for sitemap / schedule). */
export async function getAllFixtures(): Promise<FixtureView[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select(fixtureSelect(home, away))
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .orderBy(asc(fixtures.kickoffAt));
  return rows.map(toView);
}

export async function getFixturesByGroup(groupName: string): Promise<FixtureView[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select(fixtureSelect(home, away))
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(eq(fixtures.groupName, groupName))
    .orderBy(asc(fixtures.kickoffAt));
  return rows.map(toView);
}

export async function getFixtureBySlug(slug: string): Promise<FixtureView | null> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select(fixtureSelect(home, away))
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(eq(fixtures.slug, slug))
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}

/** Distinct group names (Group A..L) in kickoff order. */
export async function getGroupNames(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ groupName: fixtures.groupName })
    .from(fixtures)
    .where(ne(fixtures.groupName, sql`''`));
  return rows
    .map((r) => r.groupName)
    .filter((g): g is string => !!g && /^Group [A-Z]$/.test(g))
    .sort();
}

export interface StandingView {
  groupName: string;
  rank: number | null;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  team: { name: string; slug: string; logo: string | null; code: string | null };
}

export async function getStandingsByGroup(groupName: string): Promise<StandingView[]> {
  const db = getDb();
  const rows = await db
    .select({
      groupName: standings.groupName,
      rank: standings.rank,
      played: standings.played,
      win: standings.win,
      draw: standings.draw,
      lose: standings.lose,
      goalsFor: standings.goalsFor,
      goalsAgainst: standings.goalsAgainst,
      points: standings.points,
      name: teams.name,
      slug: teams.slug,
      logo: teams.logo,
      code: teams.code,
    })
    .from(standings)
    .leftJoin(teams, eq(standings.teamId, teams.id))
    .where(eq(standings.groupName, groupName))
    .orderBy(asc(standings.rank));
  return rows.map((r) => ({
    groupName: r.groupName,
    rank: r.rank,
    played: r.played,
    win: r.win,
    draw: r.draw,
    lose: r.lose,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    points: r.points,
    team: { name: r.name ?? "TBD", slug: r.slug ?? "", logo: r.logo, code: r.code },
  }));
}

export interface ArticleView {
  id: number;
  slug: string;
  locale: string;
  type: string;
  title: string;
  summary: string | null;
  body: string;
  fixtureId: number | null;
  status: string;
  publishedAt: Date | null;
}

export async function getLatestArticles(locale = "id", limit = 10): Promise<ArticleView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.status, "published")))
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
    .limit(limit);
  return rows as unknown as ArticleView[];
}

export async function getArticlesForFixture(
  fixtureId: number,
  locale = "id"
): Promise<ArticleView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.fixtureId, fixtureId),
        eq(articles.locale, locale),
        eq(articles.status, "published")
      )
    );
  return rows as unknown as ArticleView[];
}

export interface InsertArticleInput {
  slug: string;
  locale: string;
  type: string;
  title: string;
  summary?: string | null;
  body: string;
  fixtureId?: number | null;
  teamId?: number | null;
  groupName?: string | null;
  status: "draft" | "published";
  qualityScore?: number | null;
  qaLog?: unknown;
  model?: string | null;
}

/** Upsert an article keyed on (slug, locale). Sets publishedAt when published. */
export async function insertArticle(input: InsertArticleInput): Promise<void> {
  const db = getDb();
  const publishedAt = input.status === "published" ? new Date() : null;
  const score =
    input.qualityScore == null ? null : Math.round(input.qualityScore);
  await db
    .insert(articles)
    .values({
      slug: input.slug,
      locale: input.locale,
      type: input.type as (typeof articles.type.enumValues)[number],
      title: input.title,
      summary: input.summary ?? null,
      body: input.body,
      fixtureId: input.fixtureId ?? null,
      teamId: input.teamId ?? null,
      groupName: input.groupName ?? null,
      status: input.status,
      qualityScore: score,
      qaLog: input.qaLog ?? null,
      model: input.model ?? null,
      publishedAt,
    })
    .onConflictDoUpdate({
      target: [articles.slug, articles.locale],
      set: {
        title: input.title,
        summary: input.summary ?? null,
        body: input.body,
        status: input.status,
        qualityScore: score,
        qaLog: input.qaLog ?? null,
        model: input.model ?? null,
        publishedAt,
        updatedAt: new Date(),
      },
    });
}

/** True if a published article with this slug+locale already exists. */
export async function articleExists(slug: string, locale = "id"): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(
      and(
        eq(articles.slug, slug),
        eq(articles.locale, locale),
        eq(articles.status, "published")
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function getArticleBySlug(slug: string, locale = "id"): Promise<ArticleView | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.locale, locale)))
    .limit(1);
  return (rows[0] as unknown as ArticleView) ?? null;
}
