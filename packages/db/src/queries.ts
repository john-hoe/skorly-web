import { and, asc, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "./client";
import { fixtures, teams, players, articles, articleType, standings, newsSignals, topics, profiles, predictions, campaigns, campaignEntries, fixtureEvents, pushSubscriptions, subscribers, comments, commentLikes, commentReports, imageLibrary, teamIdentities } from "./schema";
import { forecastMatch, forecastSummary, type MatchForecast, type TeamForm } from "@skorly/predict-model";

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
  homeTeamId: number | null;
  awayTeamId: number | null;
  home: { id: number | null; name: string; slug: string; logo: string | null; code: string | null };
  away: { id: number | null; name: string; slug: string; logo: string | null; code: string | null };
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
    homeTeamId: fixtures.homeTeamId,
    awayTeamId: fixtures.awayTeamId,
    homeId: home.id,
    homeName: home.name,
    homeSlug: home.slug,
    homeLogo: home.logo,
    homeCode: home.code,
    awayId: away.id,
    awayName: away.name,
    awaySlug: away.slug,
    awayLogo: away.logo,
    awayCode: away.code,
  };
}

type Row = Record<string, unknown>;

/** Normalize a possibly-invalid DB timestamp to a valid Date or null. */
function safeDate(v: unknown): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toView(r: Row): FixtureView {
  return {
    id: r.id as number,
    slug: r.slug as string,
    round: r.round as string | null,
    groupName: r.groupName as string | null,
    stage: r.stage as string | null,
    kickoffAt: safeDate(r.kickoffAt),
    venue: r.venue as string | null,
    city: r.city as string | null,
    status: r.status as string,
    homeGoals: r.homeGoals as number | null,
    awayGoals: r.awayGoals as number | null,
    elapsed: r.elapsed as number | null,
    homeTeamId: (r.homeTeamId as number | null) ?? null,
    awayTeamId: (r.awayTeamId as number | null) ?? null,
    home: {
      id: (r.homeId as number | null) ?? null,
      name: (r.homeName as string) ?? "TBD",
      slug: (r.homeSlug as string) ?? "",
      logo: r.homeLogo as string | null,
      code: r.homeCode as string | null,
    },
    away: {
      id: (r.awayId as number | null) ?? null,
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

/* ------------------------------------------------------------------ */
/* 二期 M2 — team pages (programmatic SEO: squad + schedule + group)    */
/* ------------------------------------------------------------------ */

export interface TeamPage {
  id: number;
  name: string;
  slug: string;
  code: string | null;
  country: string | null;
  logo: string | null;
  group: string | null;
}

/** All team slugs (for generateStaticParams). */
export async function getAllTeamSlugs(): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ slug: teams.slug }).from(teams);
  return rows.map((r) => r.slug).filter((s): s is string => !!s);
}

/** Team header data + its group (from standings membership). */
export async function getTeamBySlug(slug: string): Promise<TeamPage | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      code: teams.code,
      country: teams.country,
      logo: teams.logo,
      group: standings.groupName,
    })
    .from(teams)
    .leftJoin(standings, eq(standings.teamId, teams.id))
    .where(eq(teams.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/** All fixtures for a team (home or away), kickoff order. */
export async function getTeamFixtures(teamId: number): Promise<FixtureView[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select(fixtureSelect(home, away))
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(or(eq(fixtures.homeTeamId, teamId), eq(fixtures.awayTeamId, teamId)))
    .orderBy(asc(fixtures.kickoffAt));
  return rows.map(toView);
}

export interface H2HSummary {
  total: number;
  homeWins: number; // wins for teamA
  awayWins: number; // wins for teamB
  draws: number;
  meetings: FixtureView[]; // finished, most recent first
}

/** Head-to-head record between two teams (finished fixtures only). */
export async function getHeadToHead(teamA: number, teamB: number): Promise<H2HSummary> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select(fixtureSelect(home, away))
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(
      and(
        eq(fixtures.status, "finished"),
        or(
          and(eq(fixtures.homeTeamId, teamA), eq(fixtures.awayTeamId, teamB)),
          and(eq(fixtures.homeTeamId, teamB), eq(fixtures.awayTeamId, teamA))
        )
      )
    )
    .orderBy(desc(fixtures.kickoffAt));

  const meetings = rows.map(toView);
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  for (const m of meetings) {
    const hg = m.homeGoals ?? 0;
    const ag = m.awayGoals ?? 0;
    // Normalise to teamA perspective.
    const aIsHome = m.home.id === teamA;
    const aGoals = aIsHome ? hg : ag;
    const bGoals = aIsHome ? ag : hg;
    if (aGoals > bGoals) homeWins++;
    else if (aGoals < bGoals) awayWins++;
    else draws++;
  }
  return { total: meetings.length, homeWins, awayWins, draws, meetings };
}

export interface SquadPlayer {
  id: number;
  name: string;
  position: string | null;
  number: number | null;
  age: number | null;
  nationality: string | null;
  photo: string | null;
}

/** Team squad (players), grouped-friendly order by position then number. */
export async function getTeamSquad(teamId: number): Promise<SquadPlayer[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      number: players.number,
      age: players.age,
      nationality: players.nationality,
      photo: players.photo,
    })
    .from(players)
    .where(eq(players.teamId, teamId))
    .orderBy(asc(players.number), asc(players.name));
  return rows;
}

/* ------------------------------------------------------------------ */
/* 二期 M2 — live scores, results & minute-level events                */
/* ------------------------------------------------------------------ */

/** Currently-live fixtures (status = 'live'), kickoff order. */
export async function getLiveFixtures(): Promise<FixtureView[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select(fixtureSelect(home, away))
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(eq(fixtures.status, "live"))
    .orderBy(asc(fixtures.kickoffAt));
  return rows.map(toView);
}

/** Most recently finished fixtures (results page), newest first. */
export async function getResultsFixtures(limit = 40): Promise<FixtureView[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select(fixtureSelect(home, away))
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(eq(fixtures.status, "finished"))
    .orderBy(desc(fixtures.kickoffAt))
    .limit(limit);
  return rows.map(toView);
}

export interface FixtureEventView {
  minute: number | null;
  type: string | null;
  detail: string | null;
  teamId: number | null;
  teamName: string | null;
  playerName: string | null;
}

/** Minute-level events (goals/cards/subs) for a fixture, chronological. */
export async function getFixtureEvents(fixtureId: number): Promise<FixtureEventView[]> {
  const db = getDb();
  const rows = await db
    .select({
      minute: fixtureEvents.minute,
      type: fixtureEvents.type,
      detail: fixtureEvents.detail,
      teamId: fixtureEvents.teamId,
      teamName: teams.name,
      playerName: fixtureEvents.playerName,
    })
    .from(fixtureEvents)
    .leftJoin(teams, eq(fixtureEvents.teamId, teams.id))
    .where(eq(fixtureEvents.fixtureId, fixtureId))
    .orderBy(asc(fixtureEvents.minute), asc(fixtureEvents.id));
  return rows.map((r) => ({
    minute: r.minute,
    type: r.type,
    detail: r.detail,
    teamId: r.teamId,
    teamName: r.teamName ?? null,
    playerName: r.playerName,
  }));
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
  imageUrl: string | null;
  sources: string[] | null;
  embeds: string[] | null;
  status: string;
  publishedAt: Date | null;
}

function cleanArticleText(markdown: string): string {
  return markdown
    .replace(/^#\s+.+$/m, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.match(/\[([^\]]+)]/)?.[1] ?? " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_>`~|[\]{}()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFromBody(body: string, fallback: string | null, maxLength = 180): string | null {
  const cleaned = cleanArticleText(body);
  const base = cleaned.length >= 40 ? cleaned : fallback?.trim() ?? "";
  if (!base) return null;
  return base.length > maxLength ? `${base.slice(0, maxLength - 3).trimEnd()}...` : base;
}

function normalizeArticleTitle(locale: string, title: string, slug: string, body?: string | null): string {
  if (locale !== "id" || !/\bASI\b/.test(title)) return title;
  const context = `${slug} ${body ?? ""}`.toLowerCase();
  if (!/\b(usa|united states|amerika serikat)\b/.test(context)) return title;
  return title.replace(/\bASI\b/g, "Amerika Serikat");
}

function localizeArticleSummary(locale: string, summary: string | null, body?: string | null): string | null {
  if (locale === "en" || !body) return summary;
  return excerptFromBody(body, summary);
}

function localizeArticleView(row: unknown): ArticleView {
  const article = row as ArticleView;
  return {
    ...article,
    title: normalizeArticleTitle(article.locale, article.title, article.slug, article.body),
    summary: localizeArticleSummary(article.locale, article.summary, article.body),
  };
}

/** Latest published news articles (type='news') for the news feed. */
export async function getLatestNews(locale = "id", limit = 30): Promise<ArticleView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.locale, locale),
        eq(articles.status, "published"),
        eq(articles.type, "news")
      )
    )
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
    .limit(limit);
  return rows.map(localizeArticleView);
}

export async function getLatestArticles(locale = "id", limit = 10): Promise<ArticleView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.status, "published")))
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
    .limit(limit);
  return rows.map(localizeArticleView);
}

/** Card fields only (no body) for listing/archive pages. */
export interface ArticleCardData {
  id: number;
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
}

/**
 * All published article cards for a locale, newest first. Optionally filter by
 * type (e.g. "news"). Selects only card fields so listing pages stay light even
 * with hundreds of articles.
 */
export async function getArticleCards(
  locale = "id",
  opts: { type?: (typeof articleType.enumValues)[number] } = {},
): Promise<ArticleCardData[]> {
  const db = getDb();
  const conds = [eq(articles.locale, locale), eq(articles.status, "published")];
  if (opts.type) conds.push(eq(articles.type, opts.type));
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      type: articles.type,
      title: articles.title,
      summary: articles.summary,
      body: articles.body,
      imageUrl: articles.imageUrl,
    })
    .from(articles)
    .where(and(...conds))
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt));
  return rows.map(({ body, ...row }) => ({
    ...row,
    title: normalizeArticleTitle(locale, row.title, row.slug, body),
    summary: localizeArticleSummary(locale, row.summary, body),
  }));
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
  return rows.map(localizeArticleView);
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
  topicId?: number | null;
  imageUrl?: string | null;
  sources?: unknown;
  embeds?: unknown;
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
      topicId: input.topicId ?? null,
      imageUrl: input.imageUrl ?? null,
      sources: input.sources ?? null,
      embeds: input.embeds ?? null,
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
        topicId: input.topicId ?? null,
        imageUrl: input.imageUrl ?? null,
        sources: input.sources ?? null,
        embeds: input.embeds ?? null,
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

/** All published article slugs for a locale (for static generation / sitemap). */
export async function getAllArticleSlugs(locale = "id"): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.status, "published")));
  return rows.map((r) => r.slug);
}

export interface ArticleSitemapEntry {
  slug: string;
  locale: string;
  title: string;
  publishedAt: Date | null;
  updatedAt: Date | null;
}

/** All published articles with timestamps, for sitemap + news-sitemap. */
export async function getArticleSitemapEntries(): Promise<ArticleSitemapEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      slug: articles.slug,
      locale: articles.locale,
      title: articles.title,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(eq(articles.status, "published"));
  return rows.map((r) => ({
    slug: r.slug,
    locale: r.locale,
    title: r.title,
    publishedAt: safeDate(r.publishedAt),
    updatedAt: safeDate(r.updatedAt),
  }));
}

/** Recent published news entries for Google News sitemap. */
export async function getNewsSitemapEntries(cutoff: Date): Promise<ArticleSitemapEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      slug: articles.slug,
      locale: articles.locale,
      title: articles.title,
      body: articles.body,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(
      and(
        eq(articles.status, "published"),
        eq(articles.type, "news"),
        gte(articles.publishedAt, cutoff)
      )
    )
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt));
  return rows.map((r) => ({
    slug: r.slug,
    locale: r.locale,
    title: normalizeArticleTitle(r.locale, r.title, r.slug, r.body),
    publishedAt: safeDate(r.publishedAt),
    updatedAt: safeDate(r.updatedAt),
  }));
}

export async function getArticleBySlug(slug: string, locale = "id"): Promise<ArticleView | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.locale, locale)))
    .limit(1);
  return rows[0] ? localizeArticleView(rows[0]) : null;
}

/* ------------------------------------------------------------------ */
/* 二期 M0 — profiles                                                  */
/* ------------------------------------------------------------------ */

export interface ProfileView {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  whatsappNumber: string | null;
  locale: string;
  favoriteTeamId: number | null;
  role: string;
  consentMarketing: boolean;
  createdAt: Date | null;
}

/** Fetch a profile by its uuid (= auth.users.id). */
export async function getProfile(id: string): Promise<ProfileView | null> {
  const db = getDb();
  const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    whatsappNumber: r.whatsappNumber,
    locale: r.locale,
    favoriteTeamId: r.favoriteTeamId,
    role: r.role,
    consentMarketing: r.consentMarketing,
    createdAt: safeDate(r.createdAt),
  };
}

export interface UpdateProfileInput {
  displayName?: string | null;
  whatsappNumber?: string | null;
  locale?: string;
  favoriteTeamId?: number | null;
  consentMarketing?: boolean;
}

export interface TeamOption {
  id: number;
  name: string;
}

/** Lightweight team list (id + name) for selectors, national teams first. */
export async function getTeamOptions(): Promise<TeamOption[]> {
  const db = getDb();
  const rows = await db
    .select({ id: teams.id, name: teams.name, isNational: teams.isNational })
    .from(teams)
    .orderBy(desc(teams.isNational), asc(teams.name));
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

/** Update editable profile fields for the given user. */
export async function updateProfile(id: string, input: UpdateProfileInput): Promise<void> {
  const db = getDb();
  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch.displayName = input.displayName;
  if (input.whatsappNumber !== undefined) patch.whatsappNumber = input.whatsappNumber;
  if (input.locale !== undefined) patch.locale = input.locale;
  if (input.favoriteTeamId !== undefined) patch.favoriteTeamId = input.favoriteTeamId;
  if (input.consentMarketing !== undefined) {
    patch.consentMarketing = input.consentMarketing;
    patch.consentAt = input.consentMarketing ? new Date() : null;
  }
  if (Object.keys(patch).length === 0) return;
  await db.update(profiles).set(patch).where(eq(profiles.id, id));
}

/* ------------------------------------------------------------------ */
/* 二期 M1 — predictions, scoring & leaderboard                        */
/* ------------------------------------------------------------------ */

/**
 * Skorly prediction scoring (no money, pure points):
 *  - exact score                     -> 5 pts
 *  - correct result + goal difference -> 3 pts
 *  - correct result only              -> 2 pts
 *  - wrong result                     -> 0 pts
 */
export function scorePrediction(
  ph: number,
  pa: number,
  ah: number,
  aa: number,
): number {
  if (ph === ah && pa === aa) return 5;
  const pr = Math.sign(ph - pa);
  const ar = Math.sign(ah - aa);
  if (pr !== ar) return 0;
  if (ph - pa === ah - aa) return 3;
  return 2;
}

export interface PredictionView {
  homeGoalsPred: number;
  awayGoalsPred: number;
  pointsAwarded: number | null;
}

/** The current user's prediction for a fixture, if any. */
export async function getPrediction(
  userId: string,
  fixtureId: number,
): Promise<PredictionView | null> {
  const db = getDb();
  const rows = await db
    .select({
      homeGoalsPred: predictions.homeGoalsPred,
      awayGoalsPred: predictions.awayGoalsPred,
      pointsAwarded: predictions.pointsAwarded,
    })
    .from(predictions)
    .where(and(eq(predictions.userId, userId), eq(predictions.fixtureId, fixtureId)))
    .limit(1);
  return rows[0] ?? null;
}

export type UpsertPredictionResult =
  | { ok: true }
  | { ok: false; reason: "locked" | "notFound" | "invalid" };

/**
 * Create/update a score prediction. Locked once kickoff has passed (or the
 * fixture is no longer "scheduled"), and never overwrites an already-scored row.
 */
export async function upsertPrediction(
  userId: string,
  fixtureId: number,
  home: number,
  away: number,
): Promise<UpsertPredictionResult> {
  if (
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0 ||
    home > 99 ||
    away > 99
  ) {
    return { ok: false, reason: "invalid" };
  }
  const db = getDb();
  const fx = await db
    .select({ status: fixtures.status, kickoffAt: fixtures.kickoffAt })
    .from(fixtures)
    .where(eq(fixtures.id, fixtureId))
    .limit(1);
  const f = fx[0];
  if (!f) return { ok: false, reason: "notFound" };
  const kickoff = safeDate(f.kickoffAt);
  const locked = f.status !== "scheduled" || (kickoff != null && kickoff.getTime() <= Date.now());
  if (locked) return { ok: false, reason: "locked" };

  await db
    .insert(predictions)
    .values({ userId, fixtureId, homeGoalsPred: home, awayGoalsPred: away })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.fixtureId],
      set: { homeGoalsPred: home, awayGoalsPred: away, submittedAt: new Date() },
      // Don't touch rows already scored.
      setWhere: sql`${predictions.pointsAwarded} is null`,
    });
  return { ok: true };
}

export interface LeaderRow {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  played: number;
  exact: number;
}

/** Global leaderboard ordered by total points (scored predictions only). */
export async function getLeaderboard(limit = 50): Promise<LeaderRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: predictions.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      points: sql<number>`coalesce(sum(${predictions.pointsAwarded}), 0)::int`,
      played: sql<number>`count(${predictions.pointsAwarded})::int`,
      exact: sql<number>`count(*) filter (where ${predictions.pointsAwarded} = 5)::int`,
    })
    .from(predictions)
    .leftJoin(profiles, eq(profiles.id, predictions.userId))
    .where(sql`${predictions.pointsAwarded} is not null`)
    .groupBy(predictions.userId, profiles.displayName, profiles.avatarUrl)
    .orderBy(desc(sql`coalesce(sum(${predictions.pointsAwarded}), 0)`))
    .limit(limit);
  return rows as LeaderRow[];
}

export interface PredictionStats {
  points: number;
  played: number;
  scored: number;
  exact: number;
  correct: number;
  rank: number | null;
}

/** A user's aggregate prediction stats + their leaderboard rank. */
export async function getUserPredictionStats(userId: string): Promise<PredictionStats> {
  const db = getDb();
  const agg = await db
    .select({
      points: sql<number>`coalesce(sum(${predictions.pointsAwarded}), 0)::int`,
      played: sql<number>`count(*)::int`,
      scored: sql<number>`count(${predictions.pointsAwarded})::int`,
      exact: sql<number>`count(*) filter (where ${predictions.pointsAwarded} = 5)::int`,
      correct: sql<number>`count(*) filter (where ${predictions.pointsAwarded} > 0)::int`,
    })
    .from(predictions)
    .where(eq(predictions.userId, userId));
  const a = agg[0] ?? { points: 0, played: 0, scored: 0, exact: 0, correct: 0 };

  // Rank = 1 + number of users with strictly more points.
  const rankRows = await db
    .select({
      rank: sql<number>`(
        select count(*) + 1 from (
          select user_id, sum(points_awarded) as p
          from predictions where points_awarded is not null
          group by user_id
          having sum(points_awarded) > ${a.points}
        ) t
      )::int`,
    })
    .from(sql`(select 1) as _`);
  const rank = a.points > 0 ? (rankRows[0]?.rank ?? null) : null;
  return { ...a, rank };
}

export interface UserPredictionRow {
  fixtureId: number;
  slug: string;
  kickoffAt: Date | null;
  status: string;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeGoalsPred: number;
  awayGoalsPred: number;
  pointsAwarded: number | null;
}

/** A user's prediction history (most recent first). */
export async function getUserPredictions(
  userId: string,
  limit = 50,
): Promise<UserPredictionRow[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select({
      fixtureId: fixtures.id,
      slug: fixtures.slug,
      kickoffAt: fixtures.kickoffAt,
      status: fixtures.status,
      homeName: home.name,
      awayName: away.name,
      homeGoals: fixtures.homeGoals,
      awayGoals: fixtures.awayGoals,
      homeGoalsPred: predictions.homeGoalsPred,
      awayGoalsPred: predictions.awayGoalsPred,
      pointsAwarded: predictions.pointsAwarded,
    })
    .from(predictions)
    .innerJoin(fixtures, eq(fixtures.id, predictions.fixtureId))
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(eq(predictions.userId, userId))
    .orderBy(desc(fixtures.kickoffAt))
    .limit(limit);
  return rows.map((r) => ({
    fixtureId: r.fixtureId,
    slug: r.slug,
    kickoffAt: safeDate(r.kickoffAt),
    status: r.status,
    homeName: r.homeName ?? "TBD",
    awayName: r.awayName ?? "TBD",
    homeGoals: r.homeGoals,
    awayGoals: r.awayGoals,
    homeGoalsPred: r.homeGoalsPred,
    awayGoalsPred: r.awayGoalsPred,
    pointsAwarded: r.pointsAwarded,
  }));
}

/**
 * Score all predictions for finished fixtures that haven't been scored yet.
 * Idempotent: only touches rows where points_awarded is null. Returns count.
 */
export async function scoreFinishedPredictions(): Promise<number> {
  const db = getDb();
  const pending = await db
    .select({
      id: predictions.id,
      homeGoalsPred: predictions.homeGoalsPred,
      awayGoalsPred: predictions.awayGoalsPred,
      homeGoals: fixtures.homeGoals,
      awayGoals: fixtures.awayGoals,
    })
    .from(predictions)
    .innerJoin(fixtures, eq(fixtures.id, predictions.fixtureId))
    .where(
      and(
        sql`${predictions.pointsAwarded} is null`,
        eq(fixtures.status, "finished"),
        sql`${fixtures.homeGoals} is not null`,
        sql`${fixtures.awayGoals} is not null`,
      ),
    );

  let scored = 0;
  for (const p of pending) {
    const pts = scorePrediction(
      p.homeGoalsPred,
      p.awayGoalsPred,
      p.homeGoals as number,
      p.awayGoals as number,
    );
    await db
      .update(predictions)
      .set({ pointsAwarded: pts })
      .where(eq(predictions.id, p.id));
    scored++;
  }
  return scored;
}

/* ------------------------------------------------------------------ */
/* 二期 M1 — statistical match forecast (Poisson, backs the AI pick)    */
/* ------------------------------------------------------------------ */

export interface MatchForecastView {
  forecast: MatchForecast;
  summary: string;
  homeName: string;
  awayName: string;
}

/** Per-team form from the live standings table (group membership row). */
async function getTeamForm(teamId: number | null): Promise<TeamForm | null> {
  if (teamId == null) return null;
  const db = getDb();
  const rows = await db
    .select({
      played: standings.played,
      goalsFor: standings.goalsFor,
      goalsAgainst: standings.goalsAgainst,
    })
    .from(standings)
    .where(eq(standings.teamId, teamId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Statistical forecast for a fixture (win/draw/loss % + most likely score).
 * Pure stats backing for the editorial pick — never betting odds.
 */
export async function getMatchForecast(
  fixtureId: number,
): Promise<MatchForecastView | null> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select({
      homeTeamId: fixtures.homeTeamId,
      awayTeamId: fixtures.awayTeamId,
      homeName: home.name,
      awayName: away.name,
    })
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(eq(fixtures.id, fixtureId))
    .limit(1);
  const f = rows[0];
  if (!f) return null;

  const [homeForm, awayForm] = await Promise.all([
    getTeamForm(f.homeTeamId),
    getTeamForm(f.awayTeamId),
  ]);

  const homeName = f.homeName ?? "TBD";
  const awayName = f.awayName ?? "TBD";
  const forecast = forecastMatch(homeForm, awayForm);
  return {
    forecast,
    summary: forecastSummary(forecast, homeName, awayName),
    homeName,
    awayName,
  };
}

/* ------------------------------------------------------------------ */
/* 二期 M1 — knockout bracket ("road to the final") predictions        */
/*                                                                     */
/* The WC2026 knockout draw isn't set yet (0 knockout fixtures), so a  */
/* per-slot bracket can't be tied to real matchups. Instead users pick */
/* their final four → finalists → champion. Stored in campaign_entries */
/* (data jsonb) against the bracket campaign. Upgradeable to a full     */
/* slot bracket once knockout fixtures exist.                          */
/* ------------------------------------------------------------------ */

export interface GroupTeam {
  id: number;
  name: string;
  slug: string;
  code: string | null;
  logo: string | null;
}
export interface TeamGroup {
  group: string;
  teams: GroupTeam[];
}

/** All qualified teams grouped by their World Cup group (for the picker). */
export async function getGroupedTeams(): Promise<TeamGroup[]> {
  const db = getDb();
  const rows = await db
    .select({
      group: standings.groupName,
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      code: teams.code,
      logo: teams.logo,
      rank: standings.rank,
    })
    .from(standings)
    .innerJoin(teams, eq(standings.teamId, teams.id))
    .orderBy(asc(standings.groupName), asc(standings.rank), asc(teams.name));

  const map = new Map<string, GroupTeam[]>();
  for (const r of rows) {
    const list = map.get(r.group) ?? [];
    list.push({ id: r.id, name: r.name, slug: r.slug, code: r.code, logo: r.logo });
    map.set(r.group, list);
  }
  return Array.from(map.entries()).map(([group, teams]) => ({ group, teams }));
}

/** A user's bracket picks (team ids); validated on save. */
export interface BracketPicks {
  semifinalists: number[]; // up to 4
  finalists: number[]; // up to 2 (subset of semifinalists)
  champion: number | null; // one of finalists
}

const BRACKET_SLUG = "wc2026-bracket";

/** Resolve a campaign id by slug (cached-friendly, tiny). */
export async function getCampaignId(slug: string): Promise<number | null> {
  const db = getDb();
  const rows = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.slug, slug))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** The signed-in user's saved bracket, if any. */
export async function getBracket(userId: string): Promise<BracketPicks | null> {
  const db = getDb();
  const campaignId = await getCampaignId(BRACKET_SLUG);
  if (campaignId == null) return null;
  const rows = await db
    .select({ data: campaignEntries.data })
    .from(campaignEntries)
    .where(
      and(eq(campaignEntries.campaignId, campaignId), eq(campaignEntries.userId, userId)),
    )
    .limit(1);
  const data = rows[0]?.data as Partial<BracketPicks> | undefined;
  if (!data) return null;
  return {
    semifinalists: Array.isArray(data.semifinalists) ? data.semifinalists : [],
    finalists: Array.isArray(data.finalists) ? data.finalists : [],
    champion: typeof data.champion === "number" ? data.champion : null,
  };
}

export type SaveBracketResult = { ok: true } | { ok: false; reason: "invalid" | "noCampaign" };

/**
 * Validate + persist a bracket. Rules: 4 distinct semifinalists, finalists ⊆
 * semifinalists (exactly 2), champion ∈ finalists. One row per (campaign,user).
 */
export async function saveBracket(
  userId: string,
  picks: BracketPicks,
): Promise<SaveBracketResult> {
  const sf = Array.from(new Set(picks.semifinalists)).filter((n) => Number.isInteger(n));
  const fin = Array.from(new Set(picks.finalists)).filter((n) => Number.isInteger(n));
  const champ = picks.champion;

  if (sf.length !== 4) return { ok: false, reason: "invalid" };
  if (fin.length !== 2 || !fin.every((t) => sf.includes(t))) {
    return { ok: false, reason: "invalid" };
  }
  if (champ == null || !fin.includes(champ)) return { ok: false, reason: "invalid" };

  const campaignId = await getCampaignId(BRACKET_SLUG);
  if (campaignId == null) return { ok: false, reason: "noCampaign" };

  const db = getDb();
  const clean: BracketPicks = { semifinalists: sf, finalists: fin, champion: champ };
  const existing = await db
    .select({ id: campaignEntries.id })
    .from(campaignEntries)
    .where(
      and(eq(campaignEntries.campaignId, campaignId), eq(campaignEntries.userId, userId)),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(campaignEntries)
      .set({ data: clean })
      .where(eq(campaignEntries.id, existing[0].id));
  } else {
    await db.insert(campaignEntries).values({ campaignId, userId, data: clean });
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* News pipeline                                                      */
/* ------------------------------------------------------------------ */

export interface DraftArticle {
  id: number;
  locale: string;
  type: string;
  body: string;
  fixtureId: number | null;
  groupName: string | null;
  qualityScore: number | null;
}

/** All draft articles (for re-gating after a QA fix). */
export async function getDraftArticles(): Promise<DraftArticle[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: articles.id,
      locale: articles.locale,
      type: articles.type,
      body: articles.body,
      fixtureId: articles.fixtureId,
      groupName: articles.groupName,
      qualityScore: articles.qualityScore,
    })
    .from(articles)
    .where(eq(articles.status, "draft"));
  return rows as DraftArticle[];
}

/** Home + away team names for a fixture (for entity checks). */
export async function getFixtureTeamNames(fixtureId: number): Promise<string[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select({ home: home.name, away: away.name })
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(eq(fixtures.id, fixtureId))
    .limit(1);
  const r = rows[0];
  if (!r) return [];
  return [r.home, r.away].filter((n): n is string => !!n);
}

/** Flip a draft article to published. */
export async function publishArticleById(id: number): Promise<void> {
  const db = getDb();
  await db
    .update(articles)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(articles.id, id));
}

/** Distinct team names (for light entity extraction in the news pipeline). */
export async function getTeamNames(): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ name: teams.name }).from(teams);
  return rows.map((r) => r.name).filter((n): n is string => !!n);
}

/**
 * (Lever B) Verified WC-2026 facts for the named teams, sourced from our
 * API-Football-backed DB (group + nearest fixture). These are ground-truth
 * facts the news writer may rely on without inventing.
 */
export async function getTeamVerifiedFacts(names: string[]): Promise<string[]> {
  if (!names.length) return [];
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const facts: string[] = [];

  for (const name of names.slice(0, 4)) {
    // Group membership (from standings)
    const st = await db
      .select({ group: standings.groupName })
      .from(standings)
      .leftJoin(teams, eq(standings.teamId, teams.id))
      .where(eq(teams.name, name))
      .limit(1);
    const group = st[0]?.group;
    if (group) {
      facts.push(`${name} is in ${group} of the 2026 FIFA World Cup.`);
    }

    // Nearest upcoming fixture involving this team
    const fx = await db
      .select({
        homeName: home.name,
        awayName: away.name,
        kickoff: fixtures.kickoffAt,
        group: fixtures.groupName,
      })
      .from(fixtures)
      .leftJoin(home, eq(fixtures.homeTeamId, home.id))
      .leftJoin(away, eq(fixtures.awayTeamId, away.id))
      .where(
        and(
          gte(fixtures.kickoffAt, sql`now() - interval '3 hours'`),
          sql`(${home.name} = ${name} OR ${away.name} = ${name})`
        )
      )
      .orderBy(asc(fixtures.kickoffAt))
      .limit(1);
    const f = fx[0];
    if (f?.homeName && f?.awayName) {
      const when = safeDate(f.kickoff);
      facts.push(
        `${f.homeName} vs ${f.awayName} is a 2026 World Cup ${f.group ?? "group stage"} fixture${
          when ? ` scheduled for ${when.toISOString().slice(0, 10)}` : ""
        }.`
      );
    }
  }
  return Array.from(new Set(facts));
}

export interface SignalInput {
  source: (typeof newsSignals.source.enumValues)[number];
  url: string;
  externalId?: string | null;
  author?: string | null;
  title: string;
  lang?: string | null;
  entities?: unknown;
  hasMedia?: boolean;
  embedUrl?: string | null;
  publishedAt?: Date | null;
}

/** Bulk-insert signals, skipping ones already stored (unique url). Returns inserted count. */
export async function insertSignals(signals: SignalInput[]): Promise<number> {
  if (!signals.length) return 0;
  const db = getDb();
  const rows = await db
    .insert(newsSignals)
    .values(
      signals.map((s) => ({
        source: s.source,
        url: s.url,
        externalId: s.externalId ?? null,
        author: s.author ?? null,
        title: s.title,
        lang: s.lang ?? null,
        entities: s.entities ?? null,
        hasMedia: s.hasMedia ?? false,
        embedUrl: s.embedUrl ?? null,
        publishedAt: s.publishedAt ?? null,
      }))
    )
    .onConflictDoNothing({ target: newsSignals.url })
    .returning({ id: newsSignals.id });
  return rows.length;
}

export interface TopicInput {
  key: string;
  title: string;
  entities?: unknown;
  heat: number;
  signalCount: number;
}

/** Upsert a topic by its dedup key; bumps heat/signalCount/updatedAt. */
export async function upsertTopic(t: TopicInput): Promise<number> {
  const db = getDb();
  const rows = await db
    .insert(topics)
    .values({
      key: t.key,
      title: t.title,
      entities: t.entities ?? null,
      heat: t.heat,
      signalCount: t.signalCount,
    })
    .onConflictDoUpdate({
      target: topics.key,
      set: {
        title: t.title,
        entities: t.entities ?? null,
        heat: t.heat,
        signalCount: t.signalCount,
        updatedAt: new Date(),
      },
    })
    .returning({ id: topics.id });
  return rows[0]!.id;
}

/** Link member signals (by url) to a topic. */
export async function linkSignalsToTopic(topicId: number, urls: string[]): Promise<void> {
  if (!urls.length) return;
  const db = getDb();
  await db
    .update(newsSignals)
    .set({ topicId })
    .where(inArray(newsSignals.url, urls));
}

export interface TopicSignal {
  source: string;
  url: string;
  author: string | null;
  title: string;
  embedUrl: string | null;
  hasMedia: boolean;
}

/** Signals belonging to a topic (for fact extraction). */
export async function getSignalsForTopic(topicId: number): Promise<TopicSignal[]> {
  const db = getDb();
  const rows = await db
    .select({
      source: newsSignals.source,
      url: newsSignals.url,
      author: newsSignals.author,
      title: newsSignals.title,
      embedUrl: newsSignals.embedUrl,
      hasMedia: newsSignals.hasMedia,
    })
    .from(newsSignals)
    .where(eq(newsSignals.topicId, topicId));
  return rows as TopicSignal[];
}

export interface TopicView {
  id: number;
  key: string;
  title: string;
  heat: number;
  signalCount: number;
  status: string;
}

/** Mark a topic's lifecycle status. */
export async function setTopicStatus(
  id: number,
  status: "pending" | "writing" | "done" | "skipped"
): Promise<void> {
  const db = getDb();
  await db.update(topics).set({ status, updatedAt: new Date() }).where(eq(topics.id, id));
}

/** Pending topics ranked by heat (for the generation step). */
export async function getPendingTopics(limit = 10): Promise<TopicView[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: topics.id,
      key: topics.key,
      title: topics.title,
      heat: topics.heat,
      signalCount: topics.signalCount,
      status: topics.status,
    })
    .from(topics)
    .where(eq(topics.status, "pending"))
    .orderBy(desc(topics.heat))
    .limit(limit);
  return rows as TopicView[];
}

/* ------------------------------------------------------------------ */
/* 二期 M3 — Web Push subscriptions                                    */
/* ------------------------------------------------------------------ */

export interface PushKeys {
  p256dh: string;
  auth: string;
}

export interface PushTopics {
  kickoff?: boolean;
  goals?: boolean;
  predictionResult?: boolean;
}

/** Upsert a browser push subscription (keyed by endpoint). */
export async function savePushSubscription(input: {
  endpoint: string;
  keys: PushKeys;
  userId?: string | null;
  locale?: string;
  topics?: PushTopics;
  userAgent?: string | null;
}): Promise<void> {
  const db = getDb();
  const topics = input.topics ?? {};
  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: input.endpoint,
      keys: input.keys,
      userId: input.userId ?? null,
      locale: input.locale ?? "id",
      kickoff: topics.kickoff ?? true,
      goals: topics.goals ?? true,
      predictionResult: topics.predictionResult ?? true,
      userAgent: input.userAgent ?? null,
      failureCount: 0,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        keys: input.keys,
        userId: input.userId ?? null,
        locale: input.locale ?? "id",
        ...(input.topics
          ? {
              kickoff: topics.kickoff ?? true,
              goals: topics.goals ?? true,
              predictionResult: topics.predictionResult ?? true,
            }
          : {}),
        failureCount: 0,
      },
    });
}

/** Remove a subscription by endpoint (unsubscribe / 410 Gone cleanup). */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = getDb();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export interface PushTarget {
  id: number;
  endpoint: string;
  keys: PushKeys;
  locale: string;
  userId: string | null;
}

type PushTopicCol = "kickoff" | "goals" | "predictionResult";

/** All subscriptions opted into a given topic. */
export async function getPushTargetsForTopic(topic: PushTopicCol): Promise<PushTarget[]> {
  const db = getDb();
  const col =
    topic === "kickoff"
      ? pushSubscriptions.kickoff
      : topic === "goals"
        ? pushSubscriptions.goals
        : pushSubscriptions.predictionResult;
  const rows = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      keys: pushSubscriptions.keys,
      locale: pushSubscriptions.locale,
      userId: pushSubscriptions.userId,
    })
    .from(pushSubscriptions)
    .where(eq(col, true));
  return rows as PushTarget[];
}

/** Subscriptions for a specific user (e.g. "your prediction result"). */
export async function getPushTargetsForUser(userId: string): Promise<PushTarget[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      keys: pushSubscriptions.keys,
      locale: pushSubscriptions.locale,
      userId: pushSubscriptions.userId,
    })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.predictionResult, true)));
  return rows as PushTarget[];
}

/** Mark a successful send (telemetry / pruning). */
export async function markPushSent(endpoint: string): Promise<void> {
  const db = getDb();
  await db
    .update(pushSubscriptions)
    .set({ lastSentAt: new Date(), failureCount: 0 })
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/** Record a delivery failure; caller deletes on 404/410. */
export async function recordPushFailure(endpoint: string): Promise<void> {
  const db = getDb();
  await db
    .update(pushSubscriptions)
    .set({ failureCount: sql`${pushSubscriptions.failureCount} + 1` })
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/* ------------------------------------------------------------------ */
/* 二期 M3 — notification triggers (kickoff / goals / your result)     */
/* ------------------------------------------------------------------ */

export interface KickoffNotice {
  fixtureId: number;
  slug: string;
  homeName: string;
  awayName: string;
}

/** Live fixtures that just kicked off and haven't fired a kickoff push yet. */
export async function getKickoffsToNotify(): Promise<KickoffNotice[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select({
      fixtureId: fixtures.id,
      slug: fixtures.slug,
      homeName: home.name,
      awayName: away.name,
    })
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(
      and(
        sql`${fixtures.notifiedKickoffAt} is null`,
        inArray(fixtures.status, ["live"]),
        sql`${fixtures.kickoffAt} > now() - interval '30 minutes'`,
      ),
    )
    .limit(50);
  return rows.map((r) => ({
    fixtureId: r.fixtureId,
    slug: r.slug,
    homeName: r.homeName ?? "TBD",
    awayName: r.awayName ?? "TBD",
  }));
}

export async function markFixtureKickoffNotified(fixtureId: number): Promise<void> {
  const db = getDb();
  await db
    .update(fixtures)
    .set({ notifiedKickoffAt: new Date() })
    .where(eq(fixtures.id, fixtureId));
}

export interface GoalNotice {
  eventId: number;
  fixtureId: number;
  slug: string;
  minute: number | null;
  scorer: string | null;
  teamName: string | null;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

/** Unnotified goal events on recent/live fixtures. */
export async function getGoalsToNotify(): Promise<GoalNotice[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const scorer = alias(teams, "scorer_team");
  const rows = await db
    .select({
      eventId: fixtureEvents.id,
      fixtureId: fixtures.id,
      slug: fixtures.slug,
      minute: fixtureEvents.minute,
      scorer: fixtureEvents.playerName,
      teamName: scorer.name,
      homeName: home.name,
      awayName: away.name,
      homeGoals: fixtures.homeGoals,
      awayGoals: fixtures.awayGoals,
    })
    .from(fixtureEvents)
    .innerJoin(fixtures, eq(fixtures.id, fixtureEvents.fixtureId))
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .leftJoin(scorer, eq(fixtureEvents.teamId, scorer.id))
    .where(
      and(
        eq(fixtureEvents.type, "Goal"),
        sql`${fixtureEvents.notifiedAt} is null`,
        sql`${fixtureEvents.createdAt} > now() - interval '6 hours'`,
      ),
    )
    .limit(100);
  return rows.map((r) => ({
    eventId: r.eventId,
    fixtureId: r.fixtureId,
    slug: r.slug,
    minute: r.minute,
    scorer: r.scorer,
    teamName: r.teamName,
    homeName: r.homeName ?? "TBD",
    awayName: r.awayName ?? "TBD",
    homeGoals: r.homeGoals,
    awayGoals: r.awayGoals,
  }));
}

export async function markEventNotified(eventId: number): Promise<void> {
  const db = getDb();
  await db
    .update(fixtureEvents)
    .set({ notifiedAt: new Date() })
    .where(eq(fixtureEvents.id, eventId));
}

export interface ResultNotice {
  predictionId: number;
  userId: string;
  slug: string;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeGoalsPred: number;
  awayGoalsPred: number;
  pointsAwarded: number;
}

/** Scored predictions whose owner hasn't been told the result yet. */
export async function getPredictionResultsToNotify(): Promise<ResultNotice[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .select({
      predictionId: predictions.id,
      userId: predictions.userId,
      slug: fixtures.slug,
      homeName: home.name,
      awayName: away.name,
      homeGoals: fixtures.homeGoals,
      awayGoals: fixtures.awayGoals,
      homeGoalsPred: predictions.homeGoalsPred,
      awayGoalsPred: predictions.awayGoalsPred,
      pointsAwarded: predictions.pointsAwarded,
    })
    .from(predictions)
    .innerJoin(fixtures, eq(fixtures.id, predictions.fixtureId))
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(
      and(
        sql`${predictions.pointsAwarded} is not null`,
        sql`${predictions.resultNotifiedAt} is null`,
      ),
    )
    .limit(500);
  return rows.map((r) => ({
    predictionId: r.predictionId,
    userId: r.userId,
    slug: r.slug,
    homeName: r.homeName ?? "TBD",
    awayName: r.awayName ?? "TBD",
    homeGoals: r.homeGoals,
    awayGoals: r.awayGoals,
    homeGoalsPred: r.homeGoalsPred,
    awayGoalsPred: r.awayGoalsPred,
    pointsAwarded: r.pointsAwarded ?? 0,
  }));
}

export async function markPredictionResultNotified(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getDb();
  await db
    .update(predictions)
    .set({ resultNotifiedAt: new Date() })
    .where(inArray(predictions.id, ids));
}

/* ------------------------------------------------------------------ */
/* 二期 M4 — subscribers (double opt-in) + premium targeting           */
/* ------------------------------------------------------------------ */

export interface UpsertSubscriberInput {
  email: string;
  whatsappNumber?: string | null;
  locale?: string;
  source?: string | null;
  consentMarketing: boolean;
  ip?: string | null;
  country?: string | null;
  userAgent?: string | null;
  confirmToken: string;
}

export interface UpsertSubscriberResult {
  alreadyConfirmed: boolean;
  confirmToken: string;
}

/**
 * Insert a pending subscriber or refresh an existing unconfirmed one.
 * Returns whether they're already confirmed (so the caller can skip the
 * opt-in email) and the active confirm token.
 */
export async function upsertSubscriber(
  input: UpsertSubscriberInput,
): Promise<UpsertSubscriberResult> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();

  const existing = await db
    .select({ id: subscribers.id, confirmedAt: subscribers.confirmedAt, confirmToken: subscribers.confirmToken })
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0]!;
    if (row.confirmedAt) {
      return { alreadyConfirmed: true, confirmToken: row.confirmToken ?? input.confirmToken };
    }
    await db
      .update(subscribers)
      .set({
        confirmToken: input.confirmToken,
        whatsappNumber: input.whatsappNumber ?? null,
        locale: input.locale ?? "id",
        source: input.source ?? null,
        consentMarketing: input.consentMarketing,
        consentAt: new Date(),
        ip: input.ip ?? null,
        country: input.country ?? null,
        userAgent: input.userAgent ?? null,
        unsubscribedAt: null,
      })
      .where(eq(subscribers.id, row.id));
    return { alreadyConfirmed: false, confirmToken: input.confirmToken };
  }

  await db.insert(subscribers).values({
    email,
    whatsappNumber: input.whatsappNumber ?? null,
    locale: input.locale ?? "id",
    source: input.source ?? null,
    consentMarketing: input.consentMarketing,
    consentAt: new Date(),
    ip: input.ip ?? null,
    country: input.country ?? null,
    userAgent: input.userAgent ?? null,
    confirmToken: input.confirmToken,
  });
  return { alreadyConfirmed: false, confirmToken: input.confirmToken };
}

export interface ConfirmedSubscriber {
  id: number;
  email: string;
  locale: string;
}

/** Mark a subscriber confirmed via their opt-in token. */
export async function confirmSubscriber(token: string): Promise<ConfirmedSubscriber | null> {
  if (!token) return null;
  const db = getDb();
  const rows = await db
    .update(subscribers)
    .set({ confirmedAt: new Date() })
    .where(and(eq(subscribers.confirmToken, token), sql`${subscribers.confirmedAt} is null`))
    .returning({ id: subscribers.id, email: subscribers.email, locale: subscribers.locale });
  if (rows.length > 0) return rows[0] as ConfirmedSubscriber;
  // Token may belong to an already-confirmed subscriber — treat as success.
  const found = await db
    .select({ id: subscribers.id, email: subscribers.email, locale: subscribers.locale })
    .from(subscribers)
    .where(eq(subscribers.confirmToken, token))
    .limit(1);
  return (found[0] as ConfirmedSubscriber) ?? null;
}

/** One-click unsubscribe by token (suppress future sends). */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token) return false;
  const db = getDb();
  const rows = await db
    .update(subscribers)
    .set({ unsubscribedAt: new Date(), consentMarketing: false })
    .where(eq(subscribers.confirmToken, token))
    .returning({ id: subscribers.id });
  return rows.length > 0;
}

export interface PremiumEmailTarget {
  email: string;
  locale: string;
  confirmToken: string | null;
}

/** Confirmed, still-subscribed recipients for a given locale. */
export async function getConfirmedSubscribers(locale?: string): Promise<PremiumEmailTarget[]> {
  const db = getDb();
  const where = locale
    ? and(
        sql`${subscribers.confirmedAt} is not null`,
        sql`${subscribers.unsubscribedAt} is null`,
        eq(subscribers.consentMarketing, true),
        eq(subscribers.locale, locale),
      )
    : and(
        sql`${subscribers.confirmedAt} is not null`,
        sql`${subscribers.unsubscribedAt} is null`,
        eq(subscribers.consentMarketing, true),
      );
  const rows = await db
    .select({
      email: subscribers.email,
      locale: subscribers.locale,
      confirmToken: subscribers.confirmToken,
    })
    .from(subscribers)
    .where(where);
  return rows as PremiumEmailTarget[];
}

export interface WhatsappTarget {
  whatsappNumber: string;
  locale: string;
}

/**
 * 二期 M7 — confirmed, still-subscribed recipients who supplied a WhatsApp
 * number. Reuses the same opt-in/consent gate as email; the number is the
 * delivery channel for WhatsApp Business template messages.
 */
export async function getConfirmedWhatsappSubscribers(
  locale?: string,
): Promise<WhatsappTarget[]> {
  const db = getDb();
  const base = [
    sql`${subscribers.confirmedAt} is not null`,
    sql`${subscribers.unsubscribedAt} is null`,
    sql`${subscribers.whatsappNumber} is not null`,
    eq(subscribers.consentMarketing, true),
  ];
  const where = locale ? and(...base, eq(subscribers.locale, locale)) : and(...base);
  const rows = await db
    .select({ whatsappNumber: subscribers.whatsappNumber, locale: subscribers.locale })
    .from(subscribers)
    .where(where);
  return rows
    .filter((r): r is { whatsappNumber: string; locale: string } => !!r.whatsappNumber)
    .map((r) => ({ whatsappNumber: r.whatsappNumber, locale: r.locale }));
}

export interface PremiumFixture {
  fixtureId: number;
  slug: string;
  homeName: string;
  awayName: string;
  kickoffAt: Date | null;
}

/**
 * Upcoming fixtures (kickoff within `withinHours`) that have a published
 * prediction article and haven't had their premium plan emailed yet.
 */
export async function getFixturesForPremiumEmail(withinHours = 12): Promise<PremiumFixture[]> {
  const db = getDb();
  const home = homeTeam();
  const away = awayTeam();
  const rows = await db
    .selectDistinct({
      fixtureId: fixtures.id,
      slug: fixtures.slug,
      homeName: home.name,
      awayName: away.name,
      kickoffAt: fixtures.kickoffAt,
    })
    .from(fixtures)
    .innerJoin(articles, and(eq(articles.fixtureId, fixtures.id), eq(articles.type, "prediction")))
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(
      and(
        sql`${fixtures.premiumEmailedAt} is null`,
        eq(fixtures.status, "scheduled"),
        sql`${fixtures.kickoffAt} > now()`,
        sql`${fixtures.kickoffAt} < now() + (${withinHours} * interval '1 hour')`,
      ),
    )
    .limit(20);
  return rows.map((r) => ({
    fixtureId: r.fixtureId,
    slug: r.slug,
    homeName: r.homeName ?? "TBD",
    awayName: r.awayName ?? "TBD",
    kickoffAt: safeDate(r.kickoffAt),
  }));
}

export async function markFixturePremiumEmailed(fixtureId: number): Promise<void> {
  const db = getDb();
  await db
    .update(fixtures)
    .set({ premiumEmailedAt: new Date() })
    .where(eq(fixtures.id, fixtureId));
}

/* ------------------------------------------------------------------ */
/* M5 - comments (articles + prediction plans) + public picks         */
/* ------------------------------------------------------------------ */

export interface CommentView {
  id: number;
  body: string;
  parentId: number | null;
  userId: string;
  authorName: string | null;
  authorAvatar: string | null;
  likeCount: number;
  likedByMe: boolean;
  createdAt: Date | null;
}

export type CommentTarget =
  | { articleId: number }
  | { fixtureId: number };

function targetCond(target: CommentTarget) {
  return "articleId" in target
    ? eq(comments.articleId, target.articleId)
    : eq(comments.fixtureId, target.fixtureId);
}

/** Visible comment thread for a target, newest roots first with their replies. */
export async function getComments(
  target: CommentTarget,
  viewerId?: string | null,
): Promise<CommentView[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      parentId: comments.parentId,
      userId: comments.userId,
      authorName: profiles.displayName,
      authorAvatar: profiles.avatarUrl,
      createdAt: comments.createdAt,
      likeCount: sql<number>`(select count(*)::int from ${commentLikes} where ${commentLikes.commentId} = ${comments.id})`,
      likedByMe: viewerId
        ? sql<boolean>`exists(select 1 from ${commentLikes} where ${commentLikes.commentId} = ${comments.id} and ${commentLikes.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(comments)
    .leftJoin(profiles, eq(comments.userId, profiles.id))
    .where(and(targetCond(target), eq(comments.isHidden, false)))
    .orderBy(asc(comments.createdAt))
    .limit(500);
  return rows as CommentView[];
}

export type AddCommentResult =
  | { ok: true; id: number }
  | { ok: false; reason: "invalid" | "parentMissing" };

/** Insert a comment (root or 1-level reply). Caller enforces auth + rate limit. */
export async function addComment(input: {
  userId: string;
  target: CommentTarget;
  body: string;
  parentId?: number | null;
}): Promise<AddCommentResult> {
  const body = input.body.trim();
  if (body.length < 2 || body.length > 2000) return { ok: false, reason: "invalid" };
  const db = getDb();

  let parentId: number | null = null;
  if (input.parentId != null) {
    const parent = await db
      .select({ id: comments.id, parentId: comments.parentId })
      .from(comments)
      .where(eq(comments.id, input.parentId))
      .limit(1);
    const p = parent[0];
    if (!p) return { ok: false, reason: "parentMissing" };
    // Flatten to 1 level: reply-to-reply attaches to the root.
    parentId = p.parentId ?? p.id;
  }

  const rows = await db
    .insert(comments)
    .values({
      userId: input.userId,
      articleId: "articleId" in input.target ? input.target.articleId : null,
      fixtureId: "fixtureId" in input.target ? input.target.fixtureId : null,
      parentId,
      body,
    })
    .returning({ id: comments.id });
  return { ok: true, id: rows[0]!.id };
}

/** Toggle a like for a comment; returns the new liked state. */
export async function toggleCommentLike(commentId: number, userId: string): Promise<boolean> {
  const db = getDb();
  const existing = await db
    .select({ commentId: commentLikes.commentId })
    .from(commentLikes)
    .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)))
    .limit(1);
  if (existing.length) {
    await db
      .delete(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)));
    return false;
  }
  await db.insert(commentLikes).values({ commentId, userId }).onConflictDoNothing();
  return true;
}

/** File a report; auto-hide once a comment crosses the report threshold. */
export async function reportComment(
  commentId: number,
  userId: string | null,
  reason?: string,
): Promise<void> {
  const db = getDb();
  await db.insert(commentReports).values({ commentId, userId, reason: reason ?? null });
  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(commentReports)
    .where(eq(commentReports.commentId, commentId));
  if ((count[0]?.n ?? 0) >= 3) {
    await db.update(comments).set({ isHidden: true }).where(eq(comments.id, commentId));
  }
}

export interface PublicPick {
  userId: string;
  authorName: string | null;
  authorAvatar: string | null;
  homeGoalsPred: number;
  awayGoalsPred: number;
  pointsAwarded: number | null;
  submittedAt: Date | null;
}

/* ------------------------------------------------------------------ */
/* M5 - private prediction mini-leagues (campaignType = referral)     */
/* ------------------------------------------------------------------ */

export interface MiniLeague {
  id: number;
  slug: string; // = invite code
  name: string;
  ownerId: string | null;
  memberCount: number;
}

interface LeagueName {
  [k: string]: string;
}

function leagueName(name: unknown): string {
  if (name && typeof name === "object") {
    const n = name as LeagueName;
    return n.default ?? n.id ?? Object.values(n)[0] ?? "Mini-league";
  }
  return typeof name === "string" ? name : "Mini-league";
}

function inviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toLowerCase();
}

/** Create a private league and enrol the owner. Returns the invite slug. */
export async function createMiniLeague(ownerId: string, name: string): Promise<MiniLeague> {
  const db = getDb();
  const clean = name.trim().slice(0, 60) || "Mini-league";
  // Retry a couple of times on the (tiny) chance of a slug collision.
  let slug = `lg-${inviteCode()}`;
  for (let i = 0; i < 3; i++) {
    const exists = await getCampaignId(slug);
    if (exists == null) break;
    slug = `lg-${inviteCode()}`;
  }
  const rows = await db
    .insert(campaigns)
    .values({
      slug,
      type: "referral",
      name: { default: clean },
      rules: { ownerId },
      isActive: true,
    })
    .returning({ id: campaigns.id, slug: campaigns.slug, name: campaigns.name });
  const c = rows[0]!;
  await db.insert(campaignEntries).values({ campaignId: c.id, userId: ownerId });
  return { id: c.id, slug: c.slug, name: leagueName(c.name), ownerId, memberCount: 1 };
}

/** Look up a league by its invite slug. */
export async function getMiniLeagueBySlug(slug: string): Promise<MiniLeague | null> {
  const db = getDb();
  const rows = await db
    .select({ id: campaigns.id, slug: campaigns.slug, name: campaigns.name, rules: campaigns.rules })
    .from(campaigns)
    .where(and(eq(campaigns.slug, slug), eq(campaigns.type, "referral")))
    .limit(1);
  const c = rows[0];
  if (!c) return null;
  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(campaignEntries)
    .where(eq(campaignEntries.campaignId, c.id));
  const rules = (c.rules ?? {}) as { ownerId?: string };
  return {
    id: c.id,
    slug: c.slug,
    name: leagueName(c.name),
    ownerId: rules.ownerId ?? null,
    memberCount: count[0]?.n ?? 0,
  };
}

export type JoinLeagueResult =
  | { ok: true; alreadyMember: boolean; league: MiniLeague }
  | { ok: false; reason: "notFound" };

/** Join a league by invite slug (idempotent — re-joining is a no-op). */
export async function joinMiniLeague(slug: string, userId: string): Promise<JoinLeagueResult> {
  const league = await getMiniLeagueBySlug(slug);
  if (!league) return { ok: false, reason: "notFound" };
  const db = getDb();
  const existing = await db
    .select({ id: campaignEntries.id })
    .from(campaignEntries)
    .where(and(eq(campaignEntries.campaignId, league.id), eq(campaignEntries.userId, userId)))
    .limit(1);
  if (existing[0]) return { ok: true, alreadyMember: true, league };
  await db.insert(campaignEntries).values({ campaignId: league.id, userId });
  return { ok: true, alreadyMember: false, league: { ...league, memberCount: league.memberCount + 1 } };
}

export interface LeagueStanding {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  played: number;
}

/** Standings for a league: members ranked by total prediction points. */
export async function getMiniLeagueStandings(campaignId: number): Promise<LeagueStanding[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: campaignEntries.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      points: sql<number>`coalesce(sum(${predictions.pointsAwarded}), 0)::int`,
      played: sql<number>`count(${predictions.id})::int`,
    })
    .from(campaignEntries)
    .leftJoin(profiles, eq(campaignEntries.userId, profiles.id))
    .leftJoin(
      predictions,
      and(eq(predictions.userId, campaignEntries.userId), sql`${predictions.pointsAwarded} is not null`),
    )
    .where(eq(campaignEntries.campaignId, campaignId))
    .groupBy(campaignEntries.userId, profiles.displayName, profiles.avatarUrl)
    .orderBy(desc(sql`coalesce(sum(${predictions.pointsAwarded}), 0)`));
  return rows.filter((r) => r.userId != null) as LeagueStanding[];
}

/** Leagues the user belongs to (for their account page). */
export async function getMyMiniLeagues(userId: string): Promise<MiniLeague[]> {
  const db = getDb();
  const rows = await db
    .select({ id: campaigns.id, slug: campaigns.slug, name: campaigns.name, rules: campaigns.rules })
    .from(campaignEntries)
    .innerJoin(campaigns, eq(campaignEntries.campaignId, campaigns.id))
    .where(and(eq(campaignEntries.userId, userId), eq(campaigns.type, "referral")));
  const out: MiniLeague[] = [];
  for (const c of rows) {
    const count = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(campaignEntries)
      .where(eq(campaignEntries.campaignId, c.id));
    const rules = (c.rules ?? {}) as { ownerId?: string };
    out.push({
      id: c.id,
      slug: c.slug,
      name: leagueName(c.name),
      ownerId: rules.ownerId ?? null,
      memberCount: count[0]?.n ?? 0,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* M6 - team identities + match poster pipeline                       */
/* ------------------------------------------------------------------ */

export interface TeamIdentityRow {
  teamId: number;
  alias: string | null;
  totemAnimal: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  flagEmoji: string | null;
  starPlayer: string | null;
  starNumber: number | null;
}

export async function getTeamIdentity(teamId: number): Promise<TeamIdentityRow | null> {
  const db = getDb();
  const rows = await db
    .select({
      teamId: teamIdentities.teamId,
      alias: teamIdentities.alias,
      totemAnimal: teamIdentities.totemAnimal,
      primaryColor: teamIdentities.primaryColor,
      secondaryColor: teamIdentities.secondaryColor,
      flagEmoji: teamIdentities.flagEmoji,
      starPlayer: teamIdentities.starPlayer,
      starNumber: teamIdentities.starNumber,
    })
    .from(teamIdentities)
    .where(eq(teamIdentities.teamId, teamId))
    .limit(1);
  return (rows[0] as TeamIdentityRow) ?? null;
}

export interface TeamIdentityInput extends Partial<Omit<TeamIdentityRow, "teamId">> {
  teamId: number;
}

/** Upsert a team identity (one row per team). */
export async function upsertTeamIdentity(input: TeamIdentityInput): Promise<void> {
  const db = getDb();
  const values = {
    teamId: input.teamId,
    alias: input.alias ?? null,
    totemAnimal: input.totemAnimal ?? null,
    primaryColor: input.primaryColor ?? null,
    secondaryColor: input.secondaryColor ?? null,
    flagEmoji: input.flagEmoji ?? null,
    starPlayer: input.starPlayer ?? null,
    starNumber: input.starNumber ?? null,
    updatedAt: new Date(),
  };
  await db
    .insert(teamIdentities)
    .values(values)
    .onConflictDoUpdate({ target: teamIdentities.teamId, set: values });
}

/** Built-in identity seed for major contenders (resolved by team code). */
export const TEAM_IDENTITY_SEED: Array<
  Omit<TeamIdentityInput, "teamId"> & { code: string }
> = [
  { code: "BRA", alias: "Seleção", totemAnimal: "jaguar", primaryColor: "#FFDF00", secondaryColor: "#009C3B", flagEmoji: "🇧🇷", starPlayer: "Vinícius Júnior", starNumber: 7 },
  { code: "ARG", alias: "La Albiceleste", totemAnimal: "condor", primaryColor: "#75AADB", secondaryColor: "#FFFFFF", flagEmoji: "🇦🇷", starPlayer: "Lionel Messi", starNumber: 10 },
  { code: "FRA", alias: "Les Bleus", totemAnimal: "rooster", primaryColor: "#0055A4", secondaryColor: "#EF4135", flagEmoji: "🇫🇷", starPlayer: "Kylian Mbappé", starNumber: 10 },
  { code: "ENG", alias: "Three Lions", totemAnimal: "lion", primaryColor: "#FFFFFF", secondaryColor: "#CF142B", flagEmoji: "🏴", starPlayer: "Jude Bellingham", starNumber: 10 },
  { code: "SPA", alias: "La Roja", totemAnimal: "bull", primaryColor: "#C60B1E", secondaryColor: "#FFC400", flagEmoji: "🇪🇸", starPlayer: "Lamine Yamal", starNumber: 19 },
  { code: "GER", alias: "Die Mannschaft", totemAnimal: "eagle", primaryColor: "#000000", secondaryColor: "#FFFFFF", flagEmoji: "🇩🇪", starPlayer: "Jamal Musiala", starNumber: 10 },
  { code: "POR", alias: "Seleção das Quinas", totemAnimal: "rooster", primaryColor: "#FF0000", secondaryColor: "#006600", flagEmoji: "🇵🇹", starPlayer: "Cristiano Ronaldo", starNumber: 7 },
  { code: "NET", alias: "Oranje", totemAnimal: "lion", primaryColor: "#FF6200", secondaryColor: "#FFFFFF", flagEmoji: "🇳🇱", starPlayer: "Virgil van Dijk", starNumber: 4 },
  { code: "BEL", alias: "Red Devils", totemAnimal: "devil", primaryColor: "#E30613", secondaryColor: "#000000", flagEmoji: "🇧🇪", starPlayer: "Kevin De Bruyne", starNumber: 7 },
  { code: "ITA", alias: "Gli Azzurri", totemAnimal: "wolf", primaryColor: "#0066CC", secondaryColor: "#FFFFFF", flagEmoji: "🇮🇹", starPlayer: "Federico Chiesa", starNumber: 14 },
  { code: "CRO", alias: "Vatreni", totemAnimal: "checkerboard falcon", primaryColor: "#FF0000", secondaryColor: "#FFFFFF", flagEmoji: "🇭🇷", starPlayer: "Luka Modrić", starNumber: 10 },
  { code: "URU", alias: "La Celeste", totemAnimal: "rhea", primaryColor: "#5CBFEB", secondaryColor: "#FFFFFF", flagEmoji: "🇺🇾", starPlayer: "Federico Valverde", starNumber: 15 },
  { code: "USA", alias: "The Stars and Stripes", totemAnimal: "bald eagle", primaryColor: "#0A3161", secondaryColor: "#B31942", flagEmoji: "🇺🇸", starPlayer: "Christian Pulisic", starNumber: 10 },
  { code: "MEX", alias: "El Tri", totemAnimal: "golden eagle", primaryColor: "#006847", secondaryColor: "#FFFFFF", flagEmoji: "🇲🇽", starPlayer: "Santiago Giménez", starNumber: 9 },
  { code: "CAN", alias: "Les Rouges", totemAnimal: "maple stag", primaryColor: "#FF0000", secondaryColor: "#FFFFFF", flagEmoji: "🇨🇦", starPlayer: "Alphonso Davies", starNumber: 19 },
  { code: "JAP", alias: "Samurai Blue", totemAnimal: "crane", primaryColor: "#000080", secondaryColor: "#FFFFFF", flagEmoji: "🇯🇵", starPlayer: "Takefusa Kubo", starNumber: 11 },
  { code: "KOR", alias: "Taegeuk Warriors", totemAnimal: "tiger", primaryColor: "#CD2E3A", secondaryColor: "#0047A0", flagEmoji: "🇰🇷", starPlayer: "Son Heung-min", starNumber: 7 },
  { code: "MOR", alias: "Atlas Lions", totemAnimal: "Atlas lion", primaryColor: "#C1272D", secondaryColor: "#006233", flagEmoji: "🇲🇦", starPlayer: "Achraf Hakimi", starNumber: 2 },
  { code: "SEN", alias: "Lions of Teranga", totemAnimal: "lion", primaryColor: "#00853F", secondaryColor: "#FDEF42", flagEmoji: "🇸🇳", starPlayer: "Sadio Mané", starNumber: 10 },
  { code: "SWI", alias: "Nati", totemAnimal: "alpine ibex", primaryColor: "#FF0000", secondaryColor: "#FFFFFF", flagEmoji: "🇨🇭", starPlayer: "Granit Xhaka", starNumber: 10 },
  { code: "COL", alias: "Los Cafeteros", totemAnimal: "condor", primaryColor: "#FCD116", secondaryColor: "#003893", flagEmoji: "🇨🇴", starPlayer: "Luis Díaz", starNumber: 7 },
  { code: "AUS", alias: "Socceroos", totemAnimal: "kangaroo", primaryColor: "#00843D", secondaryColor: "#FFCD00", flagEmoji: "🇦🇺", starPlayer: "Mathew Leckie", starNumber: 7 },
];

/**
 * Seed/refresh the team identity registry from the built-in dataset, matching
 * teams by their `code`. Returns how many rows were written.
 */
export async function seedTeamIdentities(): Promise<number> {
  const db = getDb();
  let written = 0;
  for (const row of TEAM_IDENTITY_SEED) {
    const team = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.code, row.code))
      .orderBy(asc(teams.id))
      .limit(1);
    const teamId = team[0]?.id;
    if (teamId == null) continue;
    const { code: _code, ...rest } = row;
    void _code;
    await upsertTeamIdentity({ teamId, ...rest });
    written++;
  }
  return written;
}

export interface PosterImage {
  id: number;
  url: string | null;
  kind: string;
  variant: string | null;
  status: string;
}

/** A ready poster of a given kind for a fixture (for display on the page). */
export async function getFixturePoster(
  fixtureId: number,
  kind: string,
): Promise<PosterImage | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: imageLibrary.id,
      url: imageLibrary.url,
      kind: imageLibrary.kind,
      variant: imageLibrary.variant,
      status: imageLibrary.status,
    })
    .from(imageLibrary)
    .where(
      and(
        eq(imageLibrary.fixtureId, fixtureId),
        eq(imageLibrary.kind, kind),
        eq(imageLibrary.status, "ready"),
        sql`${imageLibrary.url} is not null`,
      ),
    )
    .orderBy(desc(imageLibrary.createdAt))
    .limit(1);
  return (rows[0] as PosterImage) ?? null;
}

/** Enqueue a poster prompt (idempotent on fixture+kind+variant). */
export async function enqueuePoster(input: {
  fixtureId: number;
  team?: string | null;
  kind: string;
  variant: string;
  prompt: string;
}): Promise<void> {
  const db = getDb();
  await db
    .insert(imageLibrary)
    .values({
      fixtureId: input.fixtureId,
      team: input.team ?? null,
      category: input.kind,
      kind: input.kind,
      variant: input.variant,
      prompt: input.prompt,
      status: "pending",
      url: null,
    })
    .onConflictDoNothing();
}

export interface PosterCandidate {
  fixtureId: number;
  slug: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

function posterCandidateSelect() {
  const home = homeTeam();
  const away = awayTeam();
  return { home, away };
}

/**
 * Upcoming fixtures within `withinHours` that have no prematch poster row yet.
 */
export async function getFixturesNeedingPrematchPoster(withinHours = 24): Promise<PosterCandidate[]> {
  const db = getDb();
  const { home, away } = posterCandidateSelect();
  const existing = db
    .select({ fid: imageLibrary.fixtureId })
    .from(imageLibrary)
    .where(eq(imageLibrary.kind, "prematch_poster"));
  const rows = await db
    .select({
      fixtureId: fixtures.id,
      slug: fixtures.slug,
      homeTeamId: fixtures.homeTeamId,
      awayTeamId: fixtures.awayTeamId,
      homeName: home.name,
      awayName: away.name,
      homeGoals: fixtures.homeGoals,
      awayGoals: fixtures.awayGoals,
    })
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(
      and(
        eq(fixtures.status, "scheduled"),
        sql`${fixtures.kickoffAt} > now()`,
        sql`${fixtures.kickoffAt} < now() + (${withinHours} * interval '1 hour')`,
        sql`${fixtures.id} not in (${existing})`,
      ),
    )
    .limit(20);
  return rows.map((r) => ({
    fixtureId: r.fixtureId,
    slug: r.slug,
    homeTeamId: r.homeTeamId,
    awayTeamId: r.awayTeamId,
    homeName: r.homeName ?? "TBD",
    awayName: r.awayName ?? "TBD",
    homeGoals: r.homeGoals,
    awayGoals: r.awayGoals,
  }));
}

/** Finished fixtures with no result card enqueued yet. */
export async function getFixturesNeedingResultCard(): Promise<PosterCandidate[]> {
  const db = getDb();
  const { home, away } = posterCandidateSelect();
  const existing = db
    .select({ fid: imageLibrary.fixtureId })
    .from(imageLibrary)
    .where(eq(imageLibrary.kind, "result_card"));
  const rows = await db
    .select({
      fixtureId: fixtures.id,
      slug: fixtures.slug,
      homeTeamId: fixtures.homeTeamId,
      awayTeamId: fixtures.awayTeamId,
      homeName: home.name,
      awayName: away.name,
      homeGoals: fixtures.homeGoals,
      awayGoals: fixtures.awayGoals,
    })
    .from(fixtures)
    .leftJoin(home, eq(fixtures.homeTeamId, home.id))
    .leftJoin(away, eq(fixtures.awayTeamId, away.id))
    .where(
      and(
        eq(fixtures.status, "finished"),
        sql`${fixtures.homeGoals} is not null`,
        sql`${fixtures.id} not in (${existing})`,
      ),
    )
    .limit(20);
  return rows.map((r) => ({
    fixtureId: r.fixtureId,
    slug: r.slug,
    homeTeamId: r.homeTeamId,
    awayTeamId: r.awayTeamId,
    homeName: r.homeName ?? "TBD",
    awayName: r.awayName ?? "TBD",
    homeGoals: r.homeGoals,
    awayGoals: r.awayGoals,
  }));
}

export interface PendingImage {
  id: number;
  fixtureId: number | null;
  kind: string;
  variant: string | null;
  prompt: string | null;
}

/** Pending poster prompts for the local GPT-Image skill to fulfill. */
export async function getPendingImages(limit = 50): Promise<PendingImage[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: imageLibrary.id,
      fixtureId: imageLibrary.fixtureId,
      kind: imageLibrary.kind,
      variant: imageLibrary.variant,
      prompt: imageLibrary.prompt,
    })
    .from(imageLibrary)
    .where(eq(imageLibrary.status, "pending"))
    .orderBy(asc(imageLibrary.createdAt))
    .limit(limit);
  return rows as PendingImage[];
}

/** Mark a pending image ready with its hosted (watermarked) URL. */
export async function markImageReady(id: number, url: string): Promise<void> {
  const db = getDb();
  await db.update(imageLibrary).set({ url, status: "ready" }).where(eq(imageLibrary.id, id));
}

export async function markImageFailed(id: number): Promise<void> {
  const db = getDb();
  await db.update(imageLibrary).set({ status: "failed" }).where(eq(imageLibrary.id, id));
}

/** Recent community picks for a fixture — structured "show your prediction". */
export async function getPublicPicks(fixtureId: number, limit = 30): Promise<PublicPick[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: predictions.userId,
      authorName: profiles.displayName,
      authorAvatar: profiles.avatarUrl,
      homeGoalsPred: predictions.homeGoalsPred,
      awayGoalsPred: predictions.awayGoalsPred,
      pointsAwarded: predictions.pointsAwarded,
      submittedAt: predictions.submittedAt,
    })
    .from(predictions)
    .leftJoin(profiles, eq(predictions.userId, profiles.id))
    .where(eq(predictions.fixtureId, fixtureId))
    .orderBy(desc(predictions.submittedAt))
    .limit(limit);
  return rows as PublicPick[];
}
