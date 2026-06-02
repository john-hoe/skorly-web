import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "./client";
import { fixtures, teams, articles, articleType, standings, newsSignals, topics } from "./schema";

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
  imageUrl: string | null;
  sources: string[] | null;
  embeds: string[] | null;
  status: string;
  publishedAt: Date | null;
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
  return rows as unknown as ArticleView[];
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
      imageUrl: articles.imageUrl,
    })
    .from(articles)
    .where(and(...conds))
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt));
  return rows as ArticleCardData[];
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

export async function getArticleBySlug(slug: string, locale = "id"): Promise<ArticleView | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.locale, locale)))
    .limit(1);
  return (rows[0] as unknown as ArticleView) ?? null;
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
