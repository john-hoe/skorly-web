import { forecastMatch, forecastSummary, type MatchForecast, type TeamForm } from "@skorly/predict-model";
import {
  callRpc,
  deleteRows,
  inFilter,
  insertRows,
  selectCount,
  selectRows,
  updateRows,
  upsertRows,
} from "@/lib/runtime/supabase-rest";

export interface RuntimeFixtureView {
  id: number;
  apiId: number;
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

export interface RuntimeFixtureEventView {
  minute: number | null;
  type: string | null;
  detail: string | null;
  teamId: number | null;
  teamName: string | null;
  playerName: string | null;
}

export interface RuntimePredictionView {
  homeGoalsPred: number;
  awayGoalsPred: number;
  pointsAwarded: number | null;
}

export interface RuntimePublicPick {
  authorName: string | null;
  authorAvatar: string | null;
  homeGoalsPred: number;
  awayGoalsPred: number;
  pointsAwarded: number | null;
  submittedAt: Date | null;
}

export interface RuntimeMatchForecastView {
  forecast: MatchForecast;
  summary: string;
  homeName: string;
  awayName: string;
}

export interface RuntimeBracketPicks {
  semifinalists: number[];
  finalists: number[];
  champion: number | null;
}

export interface RuntimeCommentTarget {
  articleId: number;
}
export interface RuntimeFixtureCommentTarget {
  fixtureId: number;
}
export type RuntimeCommentTargetInput = RuntimeCommentTarget | RuntimeFixtureCommentTarget;

export interface RuntimeCommentView {
  id: number;
  body: string;
  parentId: number | null;
  userId: string;
  authorName: string | null;
  authorAvatar: string | null;
  createdAt: Date | null;
  likeCount: number;
  likedByMe: boolean;
}

export interface RuntimeAdminCommentModerationItem {
  commentId: number;
  body: string;
  isHidden: boolean;
  parentId: number | null;
  createdAt: Date | null;
  author: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
  target: {
    type: "article" | "fixture" | "unknown";
    label: string;
    href: string | null;
  };
  reportCount: number;
  pendingReportCount: number;
  latestReportAt: Date | null;
  reasons: string[];
  reports: Array<{
    id: number;
    reason: string | null;
    reporterName: string | null;
    reporterEmail: string | null;
    createdAt: Date | null;
    reviewedAt: Date | null;
  }>;
}

export interface RuntimeMiniLeague {
  id: number;
  slug: string;
  name: string;
  ownerId: string | null;
  memberCount: number;
}

export interface RuntimeLeagueStanding {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  played: number;
}

export interface RuntimePredictionStats {
  points: number;
  played: number;
  scored: number;
  exact: number;
  correct: number;
  rank: number | null;
}

export interface RuntimeProfileView {
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

export type RuntimeAdminAuditMeta = Record<string, unknown>;

export interface RuntimeAdminAuditLogView {
  id: number;
  actorId: string;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  target: string;
  meta: RuntimeAdminAuditMeta | null;
  createdAt: Date | null;
}

export interface RuntimeAdminAuditLogInput {
  actorId: string;
  action: string;
  target: string;
  meta?: RuntimeAdminAuditMeta | null;
}

export interface RuntimeAdminOverviewStats {
  generatedAt: Date;
  users: {
    total: number;
    new7d: number;
    new30d: number;
    deleted: number;
    byRole: Array<{ role: string; count: number }>;
    byLocale: Array<{ locale: string; count: number }>;
  };
  predictions: {
    total: number;
    last7d: number;
    weeklyActivePredictors: number;
    predictionsPerUser: number;
  };
  subscriptions: {
    subscribersTotal: number;
    subscribersConfirmed: number;
    subscribersEmail: number;
    subscribersWhatsapp: number;
    subscribersNew7d: number;
    pushSubscriptions: number;
  };
  content: {
    articlesTotal: number;
    published: number;
    draft: number;
    publishedLast48h: number;
    byType: Array<{ type: string; count: number }>;
    byLocale: Array<{ locale: string; count: number }>;
  };
  engagement: {
    commentsTotal: number;
    commentsLast7d: number;
    commentReportsTotal: number;
  };
  campaigns: {
    entriesTotal: number;
  };
}

export interface RuntimeTeamOption {
  id: number;
  name: string;
}

export interface RuntimeGroupTeam {
  id: number;
  name: string;
  slug: string;
  code: string | null;
  logo: string | null;
}

export interface RuntimeTeamGroup {
  group: string;
  teams: RuntimeGroupTeam[];
}

export interface RuntimeUserPredictionRow {
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

export interface RuntimeLeaderRow {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  played: number;
  exact: number;
}

export interface RuntimeArticleCardData {
  id: number;
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
}

export interface RuntimeArticleForFixture {
  type: string;
  body: string;
}

export interface RuntimePushKeys {
  p256dh: string;
  auth: string;
}

export interface RuntimePushTopics {
  kickoff?: boolean;
  goals?: boolean;
  predictionResult?: boolean;
}

export interface RuntimeUpsertSubscriberInput {
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

export interface RuntimeUpsertSubscriberResult {
  alreadyConfirmed: boolean;
  confirmToken: string;
}

export interface RuntimeConfirmedSubscriber {
  id: number;
  email: string;
  locale: string;
}

interface FixtureRow {
  id: number;
  api_id: number;
  slug: string;
  round: string | null;
  group_name: string | null;
  stage: string | null;
  kickoff_at: string | null;
  venue: string | null;
  city: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  elapsed: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
}

interface TeamRow {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  code: string | null;
}

interface StandingRow {
  team_id: number;
  played: number;
  goals_for: number;
  goals_against: number;
}

interface GroupedStandingRow {
  group_name: string;
  team_id: number;
  rank: number | null;
}

interface ProfileRow {
  id: string;
  email?: string | null;
  display_name: string | null;
  avatar_url: string | null;
  whatsapp_number?: string | null;
  locale?: string;
  favorite_team_id?: number | null;
  role?: string;
  consent_marketing?: boolean;
  created_at?: string | null;
}

interface AdminAuditLogRow {
  id: number;
  actor_id: string;
  action: string;
  target: string;
  meta: RuntimeAdminAuditMeta | null;
  created_at: string | null;
}

interface PredictionRow {
  user_id: string;
  fixture_id: number;
  home_goals_pred: number;
  away_goals_pred: number;
  points_awarded: number | null;
  submitted_at: string | null;
}

interface ArticleCardRow {
  id: number;
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  body: string;
  image_url: string | null;
}

interface CampaignRow {
  id: number;
  slug: string;
  name: unknown;
  rules: unknown;
}

interface CampaignEntryRow {
  id: number;
  campaign_id: number;
  user_id: string | null;
  data: unknown;
}

interface CommentRow {
  id: number;
  body: string;
  parent_id: number | null;
  user_id: string;
  article_id?: number | null;
  fixture_id?: number | null;
  is_hidden?: boolean;
  created_at: string | null;
}

interface CommentLikeRow {
  comment_id: number;
  user_id: string;
}

interface CommentReportRow {
  id: number;
  comment_id: number;
  user_id: string | null;
  reason: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface AdminArticleTargetRow {
  id: number;
  slug: string;
  locale: string;
  title: string;
}

interface SubscriberRow {
  id: number;
  email: string;
  locale: string;
  confirmed_at: string | null;
  confirm_token: string | null;
}

interface UserIdRow {
  user_id: string;
}

const FIXTURE_SELECT =
  "id,api_id,slug,round,group_name,stage,kickoff_at,venue,city,status,home_goals,away_goals,elapsed,home_team_id,away_team_id";
const TEAM_SELECT = "id,name,slug,logo,code";
const BRACKET_SLUG = "wc2026-bracket";
const ADMIN_LOCALES = ["id", "vi", "en", "zh"] as const;
const ADMIN_ROLES = ["member", "premium", "admin"] as const;
const ADMIN_ARTICLE_TYPES = [
  "preview",
  "watchpoints",
  "prediction",
  "recap",
  "tactical",
  "group_analysis",
  "news",
] as const;

function safeDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

function cleanArticleText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_`~-]/g, " ")
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
  if (locale === "vi") {
    return title
      .replace(/^Pratinjau Piala Dunia 2026:/i, "Nhận định World Cup 2026:")
      .replace(/^Prediksi Piala Dunia 2026:/i, "Dự đoán World Cup 2026:");
  }
  if (locale !== "id" || !/\bASI\b/.test(title)) return title;
  const context = `${slug} ${body ?? ""}`.toLowerCase();
  if (!/\b(usa|united states|amerika serikat)\b/.test(context)) return title;
  return title.replace(/\bASI\b/g, "Amerika Serikat");
}

function localizeArticleSummary(locale: string, summary: string | null, body?: string | null): string | null {
  const localized = locale === "en" || !body ? summary : excerptFromBody(body, summary);
  if (locale === "id") return localized?.replace(/\bASI\b/g, "Amerika Serikat") ?? null;
  return localized;
}

function compactIds(values: Array<number | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is number => Number.isInteger(v))));
}

async function teamsById(ids: Array<number | null | undefined>) {
  const clean = compactIds(ids);
  if (clean.length === 0) return new Map<number, TeamRow>();
  const rows = await selectRows<TeamRow>("teams", {
    select: TEAM_SELECT,
    id: inFilter(clean),
  });
  return new Map(rows.map((r) => [r.id, r]));
}

async function profilesById(ids: Array<string | null | undefined>) {
  const clean = Array.from(new Set(ids.filter((v): v is string => !!v)));
  if (clean.length === 0) return new Map<string, ProfileRow>();
  const rows = await selectRows<ProfileRow>("profiles", {
    select: "id,email,display_name,avatar_url",
    id: inFilter(clean),
  });
  return new Map(rows.map((r) => [r.id, r]));
}

function toFixture(row: FixtureRow, teams: Map<number, TeamRow>): RuntimeFixtureView {
  const home = row.home_team_id == null ? undefined : teams.get(row.home_team_id);
  const away = row.away_team_id == null ? undefined : teams.get(row.away_team_id);
  return {
    id: row.id,
    apiId: row.api_id,
    slug: row.slug,
    round: row.round,
    groupName: row.group_name,
    stage: row.stage,
    kickoffAt: safeDate(row.kickoff_at),
    venue: row.venue,
    city: row.city,
    status: row.status,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
    elapsed: row.elapsed,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    home: {
      id: home?.id ?? null,
      name: home?.name ?? "TBD",
      slug: home?.slug ?? "",
      logo: home?.logo ?? null,
      code: home?.code ?? null,
    },
    away: {
      id: away?.id ?? null,
      name: away?.name ?? "TBD",
      slug: away?.slug ?? "",
      logo: away?.logo ?? null,
      code: away?.code ?? null,
    },
  };
}

async function fixtureRowsToViews(rows: FixtureRow[]) {
  const teams = await teamsById(rows.flatMap((r) => [r.home_team_id, r.away_team_id]));
  return rows.map((r) => toFixture(r, teams));
}

export async function getRuntimeLiveFixtures(): Promise<RuntimeFixtureView[]> {
  const rows = await selectRows<FixtureRow>("fixtures", {
    select: FIXTURE_SELECT,
    status: "eq.live",
    order: "kickoff_at.asc",
  });
  return fixtureRowsToViews(rows);
}

export async function getRuntimeResultsFixtures(limit = 40): Promise<RuntimeFixtureView[]> {
  const rows = await selectRows<FixtureRow>("fixtures", {
    select: FIXTURE_SELECT,
    status: "eq.finished",
    order: "kickoff_at.desc",
    limit,
  });
  return fixtureRowsToViews(rows);
}

export async function getRuntimeUpcomingFixtures(limit = 8): Promise<RuntimeFixtureView[]> {
  const rows = await selectRows<FixtureRow>("fixtures", {
    select: FIXTURE_SELECT,
    kickoff_at: `gte.${new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()}`,
    order: "kickoff_at.asc",
    limit,
  });
  return fixtureRowsToViews(rows);
}

export async function getRuntimeGroupNames(): Promise<string[]> {
  const rows = await selectRows<{ group_name: string | null }>("fixtures", {
    select: "group_name",
    group_name: "not.is.null",
  });
  return Array.from(
    new Set(
      rows
        .map((r) => r.group_name)
        .filter((g): g is string => !!g && /^Group [A-Z]$/.test(g)),
    ),
  ).sort();
}

export async function getRuntimeFixtureEvents(
  fixtureId: number,
): Promise<RuntimeFixtureEventView[]> {
  const rows = await selectRows<{
    minute: number | null;
    type: string | null;
    detail: string | null;
    team_id: number | null;
    player_name: string | null;
  }>("fixture_events", {
    select: "minute,type,detail,team_id,player_name",
    fixture_id: `eq.${fixtureId}`,
    order: "minute.asc,id.asc",
  });
  const teams = await teamsById(rows.map((r) => r.team_id));
  return rows.map((r) => ({
    minute: r.minute,
    type: r.type,
    detail: r.detail,
    teamId: r.team_id,
    teamName: r.team_id == null ? null : teams.get(r.team_id)?.name ?? null,
    playerName: r.player_name,
  }));
}

export async function getRuntimePrediction(
  userId: string,
  fixtureId: number,
): Promise<RuntimePredictionView | null> {
  const rows = await selectRows<PredictionRow>("predictions", {
    select: "user_id,fixture_id,home_goals_pred,away_goals_pred,points_awarded,submitted_at",
    user_id: `eq.${userId}`,
    fixture_id: `eq.${fixtureId}`,
    limit: 1,
  });
  const p = rows[0];
  return p
    ? {
        homeGoalsPred: p.home_goals_pred,
        awayGoalsPred: p.away_goals_pred,
        pointsAwarded: p.points_awarded,
      }
    : null;
}

export type RuntimeUpsertPredictionResult =
  | { ok: true }
  | { ok: false; reason: "locked" | "notFound" | "invalid" };

export async function upsertRuntimePrediction(
  userId: string,
  fixtureId: number,
  home: number,
  away: number,
): Promise<RuntimeUpsertPredictionResult> {
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

  const fixtures = await selectRows<Pick<FixtureRow, "status" | "kickoff_at">>("fixtures", {
    select: "status,kickoff_at",
    id: `eq.${fixtureId}`,
    limit: 1,
  });
  const f = fixtures[0];
  if (!f) return { ok: false, reason: "notFound" };
  const kickoff = safeDate(f.kickoff_at);
  if (f.status !== "scheduled" || (kickoff != null && kickoff.getTime() <= Date.now())) {
    return { ok: false, reason: "locked" };
  }

  const existing = await selectRows<Pick<PredictionRow, "points_awarded">>("predictions", {
    select: "points_awarded",
    user_id: `eq.${userId}`,
    fixture_id: `eq.${fixtureId}`,
    limit: 1,
  });
  if (existing[0]?.points_awarded != null) return { ok: true };

  await upsertRows(
    "predictions",
    {
      user_id: userId,
      fixture_id: fixtureId,
      home_goals_pred: home,
      away_goals_pred: away,
      submitted_at: new Date().toISOString(),
    },
    "user_id,fixture_id",
    { returning: false },
  );
  return { ok: true };
}

async function teamForm(teamId: number | null): Promise<TeamForm | null> {
  if (teamId == null) return null;
  const rows = await selectRows<StandingRow>("standings", {
    select: "team_id,played,goals_for,goals_against",
    team_id: `eq.${teamId}`,
    limit: 1,
  });
  const row = rows[0];
  return row
    ? { played: row.played, goalsFor: row.goals_for, goalsAgainst: row.goals_against }
    : null;
}

export async function getRuntimeMatchForecast(
  fixtureId: number,
): Promise<RuntimeMatchForecastView | null> {
  const rows = await selectRows<Pick<FixtureRow, "home_team_id" | "away_team_id">>("fixtures", {
    select: "home_team_id,away_team_id",
    id: `eq.${fixtureId}`,
    limit: 1,
  });
  const fixture = rows[0];
  if (!fixture) return null;
  const teams = await teamsById([fixture.home_team_id, fixture.away_team_id]);
  const [homeForm, awayForm] = await Promise.all([
    teamForm(fixture.home_team_id),
    teamForm(fixture.away_team_id),
  ]);
  const homeName = fixture.home_team_id == null ? "TBD" : teams.get(fixture.home_team_id)?.name ?? "TBD";
  const awayName = fixture.away_team_id == null ? "TBD" : teams.get(fixture.away_team_id)?.name ?? "TBD";
  const forecast = forecastMatch(homeForm, awayForm);
  return { forecast, summary: forecastSummary(forecast, homeName, awayName), homeName, awayName };
}

export async function getRuntimePublicPicks(
  fixtureId: number,
  limit = 30,
): Promise<RuntimePublicPick[]> {
  const rows = await selectRows<PredictionRow>("predictions", {
    select: "user_id,fixture_id,home_goals_pred,away_goals_pred,points_awarded,submitted_at",
    fixture_id: `eq.${fixtureId}`,
    order: "submitted_at.desc",
    limit,
  });
  const profiles = await profilesById(rows.map((r) => r.user_id));
  return rows.map((r) => {
    const p = profiles.get(r.user_id);
    return {
      authorName: p?.display_name ?? null,
      authorAvatar: p?.avatar_url ?? null,
      homeGoalsPred: r.home_goals_pred,
      awayGoalsPred: r.away_goals_pred,
      pointsAwarded: r.points_awarded,
      submittedAt: safeDate(r.submitted_at),
    };
  });
}

export async function getRuntimeProfile(id: string): Promise<RuntimeProfileView | null> {
  const rows = await selectRows<ProfileRow>("profiles", {
    select:
      "id,email,display_name,avatar_url,whatsapp_number,locale,favorite_team_id,role,consent_marketing,created_at",
    id: `eq.${id}`,
    limit: 1,
  });
  const r = rows[0];
  return r
    ? {
        id: r.id,
        email: r.email ?? null,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        whatsappNumber: r.whatsapp_number ?? null,
        locale: r.locale ?? "id",
        favoriteTeamId: r.favorite_team_id ?? null,
        role: r.role ?? "member",
        consentMarketing: r.consent_marketing ?? false,
        createdAt: safeDate(r.created_at),
      }
    : null;
}

export async function insertRuntimeAdminAuditLog(
  input: RuntimeAdminAuditLogInput,
): Promise<number> {
  const rows = await insertRows<{ id: number }>(
    "admin_audit_log",
    {
      actor_id: input.actorId,
      action: input.action,
      target: input.target,
      meta: input.meta ?? null,
    },
    { returning: true },
  );
  return rows[0]?.id ?? 0;
}

export async function updateRuntimeAdminAuditLogMeta(
  id: number,
  meta: RuntimeAdminAuditMeta | null,
): Promise<void> {
  if (!id) return;
  await updateRows("admin_audit_log", { id: `eq.${id}` }, { meta }, { returning: false });
}

export async function getRuntimeRecentAdminAuditLogs(
  limit = 20,
): Promise<RuntimeAdminAuditLogView[]> {
  const rows = await selectRows<AdminAuditLogRow>("admin_audit_log", {
    select: "id,actor_id,action,target,meta,created_at",
    order: "created_at.desc",
    limit,
  });
  const profiles = await profilesById(rows.map((r) => r.actor_id));
  return rows.map((r) => {
    const profile = profiles.get(r.actor_id);
    return {
      id: r.id,
      actorId: r.actor_id,
      actorEmail: profile?.email ?? null,
      actorName: profile?.display_name ?? null,
      action: r.action,
      target: r.target,
      meta: r.meta ?? null,
      createdAt: safeDate(r.created_at),
    };
  });
}

async function fixedDistribution(
  table: string,
  column: string,
  values: readonly string[],
  baseQuery: Record<string, string | number | boolean | null | undefined> = {},
): Promise<Array<{ label: string; count: number }>> {
  const counts = await Promise.all(
    values.map(async (value) => ({
      label: value,
      count: await selectCount(table, { ...baseQuery, [column]: `eq.${value}` }),
    })),
  );
  return counts;
}

function withOther<Key extends "role" | "locale" | "type">(
  total: number,
  rows: Array<{ label: string; count: number }>,
  key: Key,
) {
  const known = rows.reduce((sum, row) => sum + row.count, 0);
  const out = rows.map((row) => ({ [key]: row.label, count: row.count }));
  const other = Math.max(0, total - known);
  if (known > total) {
    console.warn("[admin] distribution counts exceeded total", { key, total, known });
  }
  if (other > 0) out.push({ [key]: "other", count: other });
  return out as Array<Record<Key, string> & { count: number }>;
}

async function weeklyActivePredictors(since: string): Promise<number> {
  const pageSize = 1_000;
  const users = new Set<string>();
  for (let offset = 0; ; offset += pageSize) {
    const rows = await selectRows<UserIdRow>("predictions", {
      select: "user_id",
      submitted_at: `gte.${since}`,
      order: "user_id.asc,fixture_id.asc",
      limit: pageSize,
      offset,
    });
    for (const row of rows) users.add(row.user_id);
    if (rows.length < pageSize) break;
  }
  return users.size;
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function countValue(value: unknown): number {
  const next = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(next) ? Math.max(0, next) : 0;
}

function textValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function rpcDistribution(value: unknown): Array<{ label: string; count: number }> {
  return arrayOf(value).map((row, index) => {
    const record = recordOf(row);
    return {
      label: textValue(record.label, `unknown_${index + 1}`),
      count: countValue(record.count),
    };
  });
}

function parseAdminOverviewStatsRpc(value: unknown): RuntimeAdminOverviewStats {
  const root = recordOf(value);
  const users = recordOf(root.users);
  const predictions = recordOf(root.predictions);
  const subscriptions = recordOf(root.subscriptions);
  const content = recordOf(root.content);
  const engagement = recordOf(root.engagement);
  const campaigns = recordOf(root.campaigns);

  const usersTotal = countValue(users.total);
  const predictionsTotal = countValue(predictions.total);
  const articleTotal = countValue(content.articlesTotal);

  return {
    generatedAt: safeDate(typeof root.generatedAt === "string" ? root.generatedAt : null) ?? new Date(),
    users: {
      total: usersTotal,
      new7d: countValue(users.new7d),
      new30d: countValue(users.new30d),
      deleted: countValue(users.deleted),
      byRole: withOther(usersTotal, rpcDistribution(users.roles), "role"),
      byLocale: withOther(usersTotal, rpcDistribution(users.locales), "locale"),
    },
    predictions: {
      total: predictionsTotal,
      last7d: countValue(predictions.last7d),
      weeklyActivePredictors: countValue(predictions.weeklyActivePredictors),
      predictionsPerUser: usersTotal > 0 ? roundMetric(predictionsTotal / usersTotal) : 0,
    },
    subscriptions: {
      subscribersTotal: countValue(subscriptions.subscribersTotal),
      subscribersConfirmed: countValue(subscriptions.subscribersConfirmed),
      subscribersEmail: countValue(subscriptions.subscribersEmail),
      subscribersWhatsapp: countValue(subscriptions.subscribersWhatsapp),
      subscribersNew7d: countValue(subscriptions.subscribersNew7d),
      pushSubscriptions: countValue(subscriptions.pushSubscriptions),
    },
    content: {
      articlesTotal: articleTotal,
      published: countValue(content.published),
      draft: countValue(content.draft),
      publishedLast48h: countValue(content.publishedLast48h),
      byType: withOther(articleTotal, rpcDistribution(content.types), "type"),
      byLocale: withOther(articleTotal, rpcDistribution(content.locales), "locale"),
    },
    engagement: {
      commentsTotal: countValue(engagement.commentsTotal),
      commentsLast7d: countValue(engagement.commentsLast7d),
      commentReportsTotal: countValue(engagement.commentReportsTotal),
    },
    campaigns: {
      entriesTotal: countValue(campaigns.entriesTotal),
    },
  };
}

async function getRuntimeAdminOverviewStatsFromRpc(): Promise<RuntimeAdminOverviewStats> {
  return parseAdminOverviewStatsRpc(await callRpc<unknown>("admin_overview_stats"));
}

async function getRuntimeAdminOverviewStatsFromRest(): Promise<RuntimeAdminOverviewStats> {
  const since7d = daysAgo(7);
  const since30d = daysAgo(30);
  const since48h = hoursAgo(48);

  const [
    usersTotal,
    usersNew7d,
    usersNew30d,
    usersDeleted,
    userRoles,
    userLocales,
    predictionsTotal,
    predictionsLast7d,
    wap,
    subscribersTotal,
    subscribersConfirmed,
    subscribersEmail,
    subscribersWhatsapp,
    subscribersNew7d,
    pushSubscriptionsTotal,
    articlesTotal,
    articlesPublished,
    articlesDraft,
    articlesPublishedLast48h,
    articleTypes,
    articleLocales,
    commentsTotal,
    commentsLast7d,
    commentReportsTotal,
    campaignEntriesTotal,
  ] = await Promise.all([
    selectCount("profiles", { deleted_at: "is.null" }),
    selectCount("profiles", { created_at: `gte.${since7d}`, deleted_at: "is.null" }),
    selectCount("profiles", { created_at: `gte.${since30d}`, deleted_at: "is.null" }),
    selectCount("profiles", { deleted_at: "not.is.null" }),
    fixedDistribution("profiles", "role", ADMIN_ROLES, { deleted_at: "is.null" }),
    fixedDistribution("profiles", "locale", ADMIN_LOCALES, { deleted_at: "is.null" }),
    selectCount("predictions", {}),
    selectCount("predictions", { submitted_at: `gte.${since7d}` }),
    weeklyActivePredictors(since7d),
    selectCount("subscribers", {}),
    selectCount("subscribers", { confirmed_at: "not.is.null" }),
    selectCount("subscribers", { email: "not.is.null" }),
    selectCount("subscribers", { whatsapp_number: "not.is.null" }),
    selectCount("subscribers", { created_at: `gte.${since7d}` }),
    selectCount("push_subscriptions", {}),
    selectCount("articles", {}),
    selectCount("articles", { status: "eq.published" }),
    selectCount("articles", { status: "eq.draft" }),
    selectCount("articles", {
      status: "eq.published",
      published_at: `gte.${since48h}`,
    }),
    fixedDistribution("articles", "type", ADMIN_ARTICLE_TYPES),
    fixedDistribution("articles", "locale", ADMIN_LOCALES),
    selectCount("comments", {}),
    selectCount("comments", { created_at: `gte.${since7d}` }),
    selectCount("comment_reports", {}),
    selectCount("campaign_entries", {}),
  ]);

  return {
    generatedAt: new Date(),
    users: {
      total: usersTotal,
      new7d: usersNew7d,
      new30d: usersNew30d,
      deleted: usersDeleted,
      byRole: withOther(usersTotal, userRoles, "role"),
      byLocale: withOther(usersTotal, userLocales, "locale"),
    },
    predictions: {
      total: predictionsTotal,
      last7d: predictionsLast7d,
      weeklyActivePredictors: wap,
      predictionsPerUser: usersTotal > 0 ? roundMetric(predictionsTotal / usersTotal) : 0,
    },
    subscriptions: {
      subscribersTotal,
      subscribersConfirmed,
      subscribersEmail,
      subscribersWhatsapp,
      subscribersNew7d,
      pushSubscriptions: pushSubscriptionsTotal,
    },
    content: {
      articlesTotal,
      published: articlesPublished,
      draft: articlesDraft,
      publishedLast48h: articlesPublishedLast48h,
      byType: withOther(articlesTotal, articleTypes, "type"),
      byLocale: withOther(articlesTotal, articleLocales, "locale"),
    },
    engagement: {
      commentsTotal,
      commentsLast7d,
      commentReportsTotal,
    },
    campaigns: {
      entriesTotal: campaignEntriesTotal,
    },
  };
}

export async function getRuntimeAdminOverviewStats(): Promise<RuntimeAdminOverviewStats> {
  try {
    return await getRuntimeAdminOverviewStatsFromRpc();
  } catch (error) {
    console.warn("[admin] admin_overview_stats RPC failed; falling back to REST aggregate", error);
    return getRuntimeAdminOverviewStatsFromRest();
  }
}

export async function getRuntimeTeamOptions(): Promise<RuntimeTeamOption[]> {
  const rows = await selectRows<{ id: number; name: string; is_national: boolean }>("teams", {
    select: "id,name,is_national",
    order: "is_national.desc,name.asc",
  });
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export async function getRuntimeGroupedTeams(): Promise<RuntimeTeamGroup[]> {
  const rows = await selectRows<GroupedStandingRow>("standings", {
    select: "group_name,team_id,rank",
    order: "group_name.asc,rank.asc",
  });
  const teams = await teamsById(rows.map((r) => r.team_id));
  const groups = new Map<string, RuntimeGroupTeam[]>();
  for (const row of rows) {
    const team = teams.get(row.team_id);
    if (!team) continue;
    const list = groups.get(row.group_name) ?? [];
    list.push({
      id: team.id,
      name: team.name,
      slug: team.slug,
      code: team.code,
      logo: team.logo,
    });
    groups.set(row.group_name, list);
  }
  return Array.from(groups.entries()).map(([group, teams]) => ({ group, teams }));
}

export async function getRuntimeUserPredictions(
  userId: string,
  limit = 50,
): Promise<RuntimeUserPredictionRow[]> {
  const predictions = await selectRows<PredictionRow>("predictions", {
    select: "user_id,fixture_id,home_goals_pred,away_goals_pred,points_awarded,submitted_at",
    user_id: `eq.${userId}`,
    order: "submitted_at.desc",
    limit,
  });
  if (predictions.length === 0) return [];
  const fixtureIds = Array.from(new Set(predictions.map((p) => p.fixture_id)));
  const fixtureRows = await selectRows<FixtureRow>("fixtures", {
    select: FIXTURE_SELECT,
    id: inFilter(fixtureIds),
  });
  const fixtures = new Map((await fixtureRowsToViews(fixtureRows)).map((f) => [f.id, f]));
  return predictions.map((p) => {
    const f = fixtures.get(p.fixture_id);
    return {
      fixtureId: p.fixture_id,
      slug: f?.slug ?? "",
      kickoffAt: f?.kickoffAt ?? null,
      status: f?.status ?? "scheduled",
      homeName: f?.home.name ?? "TBD",
      awayName: f?.away.name ?? "TBD",
      homeGoals: f?.homeGoals ?? null,
      awayGoals: f?.awayGoals ?? null,
      homeGoalsPred: p.home_goals_pred,
      awayGoalsPred: p.away_goals_pred,
      pointsAwarded: p.points_awarded,
    };
  });
}

function normalizeBracket(data: unknown): RuntimeBracketPicks | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Partial<RuntimeBracketPicks>;
  return {
    semifinalists: Array.isArray(raw.semifinalists) ? raw.semifinalists : [],
    finalists: Array.isArray(raw.finalists) ? raw.finalists : [],
    champion: typeof raw.champion === "number" ? raw.champion : null,
  };
}

async function getCampaignId(slug: string): Promise<number | null> {
  const rows = await selectRows<{ id: number }>("campaigns", {
    select: "id",
    slug: `eq.${slug}`,
    limit: 1,
  });
  return rows[0]?.id ?? null;
}

export async function getRuntimeBracket(userId: string): Promise<RuntimeBracketPicks | null> {
  const campaignId = await getCampaignId(BRACKET_SLUG);
  if (campaignId == null) return null;
  const rows = await selectRows<Pick<CampaignEntryRow, "data">>("campaign_entries", {
    select: "data",
    campaign_id: `eq.${campaignId}`,
    user_id: `eq.${userId}`,
    limit: 1,
  });
  return normalizeBracket(rows[0]?.data);
}

export type RuntimeSaveBracketResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "noCampaign" };

export async function saveRuntimeBracket(
  userId: string,
  picks: RuntimeBracketPicks,
): Promise<RuntimeSaveBracketResult> {
  const sf = Array.from(new Set(picks.semifinalists)).filter((n) => Number.isInteger(n));
  const fin = Array.from(new Set(picks.finalists)).filter((n) => Number.isInteger(n));
  const champ = picks.champion;
  if (sf.length !== 4) return { ok: false, reason: "invalid" };
  if (fin.length !== 2 || !fin.every((t) => sf.includes(t))) return { ok: false, reason: "invalid" };
  if (champ == null || !fin.includes(champ)) return { ok: false, reason: "invalid" };

  const campaignId = await getCampaignId(BRACKET_SLUG);
  if (campaignId == null) return { ok: false, reason: "noCampaign" };
  const clean = { semifinalists: sf, finalists: fin, champion: champ };
  const existing = await selectRows<Pick<CampaignEntryRow, "id">>("campaign_entries", {
    select: "id",
    campaign_id: `eq.${campaignId}`,
    user_id: `eq.${userId}`,
    limit: 1,
  });
  if (existing[0]) {
    await updateRows("campaign_entries", { id: `eq.${existing[0].id}` }, { data: clean }, { returning: false });
  } else {
    await insertRows("campaign_entries", { campaign_id: campaignId, user_id: userId, data: clean }, { returning: false });
  }
  return { ok: true };
}

export async function getRuntimeComments(
  target: RuntimeCommentTargetInput,
  viewerId?: string | null,
): Promise<RuntimeCommentView[]> {
  const targetFilter =
    "articleId" in target ? { article_id: `eq.${target.articleId}` } : { fixture_id: `eq.${target.fixtureId}` };
  const rows = await selectRows<CommentRow>("comments", {
    select: "id,body,parent_id,user_id,created_at",
    ...targetFilter,
    is_hidden: "eq.false",
    order: "created_at.asc",
    limit: 500,
  });
  const commentIds = rows.map((r) => r.id);
  const [profiles, likes] = await Promise.all([
    profilesById(rows.map((r) => r.user_id)),
    commentIds.length
      ? selectRows<CommentLikeRow>("comment_likes", {
          select: "comment_id,user_id",
          comment_id: inFilter(commentIds),
        })
      : Promise.resolve([]),
  ]);
  const likeCounts = new Map<number, number>();
  const likedByMe = new Set<number>();
  for (const like of likes) {
    likeCounts.set(like.comment_id, (likeCounts.get(like.comment_id) ?? 0) + 1);
    if (viewerId && like.user_id === viewerId) likedByMe.add(like.comment_id);
  }
  return rows.map((r) => {
    const p = profiles.get(r.user_id);
    return {
      id: r.id,
      body: r.body,
      parentId: r.parent_id,
      userId: r.user_id,
      authorName: p?.display_name ?? null,
      authorAvatar: p?.avatar_url ?? null,
      createdAt: safeDate(r.created_at),
      likeCount: likeCounts.get(r.id) ?? 0,
      likedByMe: likedByMe.has(r.id),
    };
  });
}

export type RuntimeAddCommentResult =
  | { ok: true; id: number }
  | { ok: false; reason: "invalid" | "parentMissing" };

export async function addRuntimeComment(input: {
  userId: string;
  target: RuntimeCommentTargetInput;
  body: string;
  parentId?: number | null;
}): Promise<RuntimeAddCommentResult> {
  const body = input.body.trim();
  if (body.length < 2 || body.length > 2000) return { ok: false, reason: "invalid" };
  let parentId: number | null = null;
  if (input.parentId != null) {
    const parent = await selectRows<Pick<CommentRow, "id" | "parent_id">>("comments", {
      select: "id,parent_id",
      id: `eq.${input.parentId}`,
      limit: 1,
    });
    const p = parent[0];
    if (!p) return { ok: false, reason: "parentMissing" };
    parentId = p.parent_id ?? p.id;
  }

  const rows = await insertRows<{ id: number }>("comments", {
    user_id: input.userId,
    article_id: "articleId" in input.target ? input.target.articleId : null,
    fixture_id: "fixtureId" in input.target ? input.target.fixtureId : null,
    parent_id: parentId,
    body,
  });
  return { ok: true, id: rows[0]!.id };
}

export async function toggleRuntimeCommentLike(commentId: number, userId: string): Promise<boolean> {
  const existing = await selectRows<CommentLikeRow>("comment_likes", {
    select: "comment_id,user_id",
    comment_id: `eq.${commentId}`,
    user_id: `eq.${userId}`,
    limit: 1,
  });
  if (existing.length) {
    await deleteRows("comment_likes", { comment_id: `eq.${commentId}`, user_id: `eq.${userId}` });
    return false;
  }
  await insertRows("comment_likes", { comment_id: commentId, user_id: userId }, { returning: false });
  return true;
}

export async function reportRuntimeComment(
  commentId: number,
  userId: string | null,
  reason?: string,
): Promise<void> {
  await insertRows("comment_reports", { comment_id: commentId, user_id: userId, reason: reason ?? null }, { returning: false });
  const count = await selectCount("comment_reports", {
    select: "id",
    comment_id: `eq.${commentId}`,
    reviewed_at: "is.null",
  });
  if (count >= 3) {
    await updateRows("comments", { id: `eq.${commentId}` }, { is_hidden: true }, { returning: false });
  }
}

export type RuntimeAdminCommentModerationStatus = "pending" | "hidden" | "all";

function adminCommentReportQuery(status: RuntimeAdminCommentModerationStatus) {
  const query: Record<string, string | number | boolean | null | undefined> = {
    select: "id,comment_id,user_id,reason,created_at,reviewed_at,reviewed_by",
    order: "created_at.desc",
    limit: 500,
  };
  if (status === "pending") query.reviewed_at = "is.null";
  return query;
}

function latestDate(values: Array<Date | null>): Date | null {
  const timestamps = values
    .map((value) => value?.getTime() ?? 0)
    .filter((value) => value > 0);
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}

function uniqueReasons(reports: CommentReportRow[]): string[] {
  return Array.from(
    new Set(
      reports
        .map((report) => report.reason?.trim())
        .filter((reason): reason is string => !!reason),
    ),
  ).slice(0, 5);
}

function commentTarget(
  comment: CommentRow,
  articles: Map<number, AdminArticleTargetRow>,
  fixtures: Map<number, RuntimeFixtureView>,
): RuntimeAdminCommentModerationItem["target"] {
  if (comment.article_id != null) {
    const article = articles.get(comment.article_id);
    if (!article) {
      return { type: "article", label: `Article #${comment.article_id}`, href: null };
    }
    return {
      type: "article",
      label: article.title,
      href: `/${article.locale}/artikel/${article.slug}`,
    };
  }
  if (comment.fixture_id != null) {
    const fixture = fixtures.get(comment.fixture_id);
    if (!fixture) {
      return { type: "fixture", label: `Fixture #${comment.fixture_id}`, href: null };
    }
    return {
      type: "fixture",
      label: `${fixture.home.name} vs ${fixture.away.name}`,
      href: `/id/pertandingan/${fixture.slug}`,
    };
  }
  return { type: "unknown", label: "Unknown target", href: null };
}

export async function getRuntimeAdminCommentModerationItems(
  status: RuntimeAdminCommentModerationStatus = "pending",
): Promise<RuntimeAdminCommentModerationItem[]> {
  const reports = await selectRows<CommentReportRow>(
    "comment_reports",
    adminCommentReportQuery(status),
  );
  const commentIds = compactIds(reports.map((report) => report.comment_id));
  if (commentIds.length === 0) return [];

  let comments = await selectRows<CommentRow>("comments", {
    select: "id,body,parent_id,user_id,article_id,fixture_id,is_hidden,created_at",
    id: inFilter(commentIds),
    order: "created_at.desc",
    limit: 500,
  });
  if (status === "hidden") {
    comments = comments.filter((comment) => comment.is_hidden);
  }
  const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
  const groupedReports = new Map<number, CommentReportRow[]>();
  for (const report of reports) {
    if (!commentsById.has(report.comment_id)) continue;
    const group = groupedReports.get(report.comment_id) ?? [];
    group.push(report);
    groupedReports.set(report.comment_id, group);
  }

  const articleIds = compactIds(comments.map((comment) => comment.article_id));
  const fixtureIds = compactIds(comments.map((comment) => comment.fixture_id));
  const [profiles, reporterProfiles, articles, fixtureRows] = await Promise.all([
    profilesById(comments.map((comment) => comment.user_id)),
    profilesById(reports.map((report) => report.user_id)),
    articleIds.length
      ? selectRows<AdminArticleTargetRow>("articles", {
          select: "id,slug,locale,title",
          id: inFilter(articleIds),
        })
      : Promise.resolve([]),
    fixtureIds.length
      ? selectRows<FixtureRow>("fixtures", {
          select: FIXTURE_SELECT,
          id: inFilter(fixtureIds),
        })
      : Promise.resolve([]),
  ]);
  const articleById = new Map(articles.map((article) => [article.id, article]));
  const fixtureViews = await fixtureRowsToViews(fixtureRows);
  const fixtureById = new Map(fixtureViews.map((fixture) => [fixture.id, fixture]));

  return comments
    .map((comment) => {
      const commentReports = groupedReports.get(comment.id) ?? [];
      const author = profiles.get(comment.user_id);
      return {
        commentId: comment.id,
        body: comment.body,
        isHidden: !!comment.is_hidden,
        parentId: comment.parent_id,
        createdAt: safeDate(comment.created_at),
        author: {
          id: comment.user_id,
          email: author?.email ?? null,
          name: author?.display_name ?? null,
          avatarUrl: author?.avatar_url ?? null,
        },
        target: commentTarget(comment, articleById, fixtureById),
        reportCount: commentReports.length,
        pendingReportCount: commentReports.filter((report) => report.reviewed_at == null).length,
        latestReportAt: latestDate(commentReports.map((report) => safeDate(report.created_at))),
        reasons: uniqueReasons(commentReports),
        reports: commentReports.slice(0, 5).map((report) => {
          const reporter = report.user_id ? reporterProfiles.get(report.user_id) : undefined;
          return {
            id: report.id,
            reason: report.reason,
            reporterName: reporter?.display_name ?? null,
            reporterEmail: reporter?.email ?? null,
            createdAt: safeDate(report.created_at),
            reviewedAt: safeDate(report.reviewed_at),
          };
        }),
      };
    })
    .sort((a, b) => (b.latestReportAt?.getTime() ?? 0) - (a.latestReportAt?.getTime() ?? 0));
}

export async function setRuntimeAdminCommentHidden(
  commentId: number,
  hidden: boolean,
): Promise<void> {
  await updateRows(
    "comments",
    { id: `eq.${commentId}` },
    { is_hidden: hidden },
    { returning: false },
  );
}

export async function markRuntimeAdminCommentReportsReviewed(
  commentId: number,
  reviewerId: string,
): Promise<void> {
  await updateRows(
    "comment_reports",
    { comment_id: `eq.${commentId}`, reviewed_at: "is.null" },
    { reviewed_at: new Date().toISOString(), reviewed_by: reviewerId },
    { returning: false },
  );
}

function leagueName(name: unknown): string {
  if (name && typeof name === "object") {
    const n = name as Record<string, unknown>;
    const value = n.default ?? n.id ?? Object.values(n)[0];
    return typeof value === "string" ? value : "Mini-league";
  }
  return typeof name === "string" ? name : "Mini-league";
}

function ownerId(rules: unknown): string | null {
  if (!rules || typeof rules !== "object") return null;
  const value = (rules as Record<string, unknown>).ownerId;
  return typeof value === "string" ? value : null;
}

function inviteCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toLowerCase();
}

async function memberCount(campaignId: number): Promise<number> {
  return selectCount("campaign_entries", { select: "id", campaign_id: `eq.${campaignId}` });
}

async function miniLeagueFromCampaign(c: CampaignRow): Promise<RuntimeMiniLeague> {
  return {
    id: c.id,
    slug: c.slug,
    name: leagueName(c.name),
    ownerId: ownerId(c.rules),
    memberCount: await memberCount(c.id),
  };
}

export async function createRuntimeMiniLeague(ownerId: string, name: string): Promise<RuntimeMiniLeague> {
  const clean = name.trim().slice(0, 60) || "Mini-league";
  let slug = `lg-${inviteCode()}`;
  for (let i = 0; i < 3; i++) {
    const exists = await getCampaignId(slug);
    if (exists == null) break;
    slug = `lg-${inviteCode()}`;
  }
  const rows = await insertRows<CampaignRow>("campaigns", {
    slug,
    type: "referral",
    name: { default: clean },
    rules: { ownerId },
    is_active: true,
  });
  const c = rows[0]!;
  await insertRows("campaign_entries", { campaign_id: c.id, user_id: ownerId }, { returning: false });
  return { id: c.id, slug: c.slug, name: leagueName(c.name), ownerId, memberCount: 1 };
}

export async function getRuntimeMiniLeagueBySlug(slug: string): Promise<RuntimeMiniLeague | null> {
  const rows = await selectRows<CampaignRow>("campaigns", {
    select: "id,slug,name,rules",
    slug: `eq.${slug}`,
    type: "eq.referral",
    limit: 1,
  });
  return rows[0] ? miniLeagueFromCampaign(rows[0]) : null;
}

export type RuntimeJoinLeagueResult =
  | { ok: true; alreadyMember: boolean; league: RuntimeMiniLeague }
  | { ok: false; reason: "notFound" };

export async function joinRuntimeMiniLeague(
  slug: string,
  userId: string,
): Promise<RuntimeJoinLeagueResult> {
  const league = await getRuntimeMiniLeagueBySlug(slug);
  if (!league) return { ok: false, reason: "notFound" };
  const existing = await selectRows<Pick<CampaignEntryRow, "id">>("campaign_entries", {
    select: "id",
    campaign_id: `eq.${league.id}`,
    user_id: `eq.${userId}`,
    limit: 1,
  });
  if (existing[0]) return { ok: true, alreadyMember: true, league };
  await insertRows("campaign_entries", { campaign_id: league.id, user_id: userId }, { returning: false });
  return { ok: true, alreadyMember: false, league: { ...league, memberCount: league.memberCount + 1 } };
}

export async function getRuntimeMiniLeagueStandings(
  campaignId: number,
): Promise<RuntimeLeagueStanding[]> {
  const entries = await selectRows<Pick<CampaignEntryRow, "user_id">>("campaign_entries", {
    select: "user_id",
    campaign_id: `eq.${campaignId}`,
  });
  const userIds = Array.from(new Set(entries.map((e) => e.user_id).filter((id): id is string => !!id)));
  if (userIds.length === 0) return [];
  const [profiles, predictions] = await Promise.all([
    profilesById(userIds),
    selectRows<Pick<PredictionRow, "user_id" | "points_awarded">>("predictions", {
      select: "user_id,points_awarded",
      user_id: inFilter(userIds),
      points_awarded: "not.is.null",
    }),
  ]);
  const stats = new Map<string, { points: number; played: number }>();
  for (const userId of userIds) stats.set(userId, { points: 0, played: 0 });
  for (const prediction of predictions) {
    const current = stats.get(prediction.user_id) ?? { points: 0, played: 0 };
    current.points += prediction.points_awarded ?? 0;
    current.played += 1;
    stats.set(prediction.user_id, current);
  }
  return userIds
    .map((userId) => {
      const profile = profiles.get(userId);
      const s = stats.get(userId) ?? { points: 0, played: 0 };
      return {
        userId,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        points: s.points,
        played: s.played,
      };
    })
    .sort((a, b) => b.points - a.points);
}

export async function getRuntimeMyMiniLeagues(userId: string): Promise<RuntimeMiniLeague[]> {
  const entries = await selectRows<Pick<CampaignEntryRow, "campaign_id">>("campaign_entries", {
    select: "campaign_id",
    user_id: `eq.${userId}`,
  });
  const ids = Array.from(new Set(entries.map((e) => e.campaign_id)));
  if (ids.length === 0) return [];
  const campaigns = await selectRows<CampaignRow>("campaigns", {
    select: "id,slug,name,rules",
    id: inFilter(ids),
    type: "eq.referral",
  });
  return Promise.all(campaigns.map(miniLeagueFromCampaign));
}

export async function getRuntimeUserPredictionStats(userId: string): Promise<RuntimePredictionStats> {
  const [mine, scored] = await Promise.all([
    selectRows<PredictionRow>("predictions", {
      select: "user_id,fixture_id,home_goals_pred,away_goals_pred,points_awarded,submitted_at",
      user_id: `eq.${userId}`,
    }),
    selectRows<Pick<PredictionRow, "user_id" | "points_awarded">>("predictions", {
      select: "user_id,points_awarded",
      points_awarded: "not.is.null",
      limit: 5000,
    }),
  ]);
  const points = mine.reduce((sum, p) => sum + (p.points_awarded ?? 0), 0);
  const scoredMine = mine.filter((p) => p.points_awarded != null);
  const totals = new Map<string, number>();
  for (const row of scored) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.points_awarded ?? 0));
  }
  const rank = points > 0 ? 1 + Array.from(totals.values()).filter((p) => p > points).length : null;
  return {
    points,
    played: mine.length,
    scored: scoredMine.length,
    exact: scoredMine.filter((p) => p.points_awarded === 5).length,
    correct: scoredMine.filter((p) => (p.points_awarded ?? 0) > 0).length,
    rank,
  };
}

export async function getRuntimeLeaderboard(limit = 50): Promise<RuntimeLeaderRow[]> {
  const rows = await selectRows<Pick<PredictionRow, "user_id" | "points_awarded">>("predictions", {
    select: "user_id,points_awarded",
    points_awarded: "not.is.null",
    limit: 5000,
  });
  const stats = new Map<string, { points: number; played: number; exact: number }>();
  for (const row of rows) {
    const current = stats.get(row.user_id) ?? { points: 0, played: 0, exact: 0 };
    current.points += row.points_awarded ?? 0;
    current.played += 1;
    if (row.points_awarded === 5) current.exact += 1;
    stats.set(row.user_id, current);
  }
  const userIds = Array.from(stats.keys());
  const profiles = await profilesById(userIds);
  return userIds
    .map((userId) => {
      const profile = profiles.get(userId);
      const s = stats.get(userId)!;
      return {
        userId,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        points: s.points,
        played: s.played,
        exact: s.exact,
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export async function getRuntimeLatestArticles(
  locale = "id",
  limit = 10,
): Promise<RuntimeArticleCardData[]> {
  const rows = await selectRows<ArticleCardRow>("articles", {
    select: "id,slug,type,title,summary,body,image_url,published_at,created_at",
    locale: `eq.${locale}`,
    status: "eq.published",
    order: "published_at.desc,created_at.desc",
    limit,
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    type: r.type,
    title: normalizeArticleTitle(locale, r.title, r.slug, r.body),
    summary: localizeArticleSummary(locale, r.summary, r.body),
    imageUrl: r.image_url,
  }));
}

export async function getRuntimeArticlesForFixture(
  fixtureId: number,
  locale: string,
): Promise<RuntimeArticleForFixture[]> {
  return selectRows<RuntimeArticleForFixture>("articles", {
    select: "type,body",
    fixture_id: `eq.${fixtureId}`,
    locale: `eq.${locale}`,
    status: "eq.published",
  });
}

export async function updateRuntimeProfile(
  id: string,
  input: {
    displayName?: string | null;
    whatsappNumber?: string | null;
    locale?: string;
    favoriteTeamId?: number | null;
    consentMarketing?: boolean;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.whatsappNumber !== undefined) patch.whatsapp_number = input.whatsappNumber;
  if (input.locale !== undefined) patch.locale = input.locale;
  if (input.favoriteTeamId !== undefined) patch.favorite_team_id = input.favoriteTeamId;
  if (input.consentMarketing !== undefined) {
    patch.consent_marketing = input.consentMarketing;
    patch.consent_at = input.consentMarketing ? new Date().toISOString() : null;
  }
  if (Object.keys(patch).length === 0) return;
  await updateRows("profiles", { id: `eq.${id}` }, patch, { returning: false });
}

export async function saveRuntimePushSubscription(input: {
  endpoint: string;
  keys: RuntimePushKeys;
  userId?: string | null;
  locale?: string;
  topics?: RuntimePushTopics;
  userAgent?: string | null;
}): Promise<void> {
  const topics = input.topics ?? {};
  await upsertRows(
    "push_subscriptions",
    {
      endpoint: input.endpoint,
      keys: input.keys,
      user_id: input.userId ?? null,
      locale: input.locale ?? "id",
      kickoff: topics.kickoff ?? true,
      goals: topics.goals ?? true,
      prediction_result: topics.predictionResult ?? true,
      user_agent: input.userAgent ?? null,
      failure_count: 0,
    },
    "endpoint",
    { returning: false },
  );
}

export async function deleteRuntimePushSubscription(endpoint: string): Promise<void> {
  await deleteRows("push_subscriptions", { endpoint: `eq.${endpoint}` });
}

export async function upsertRuntimeSubscriber(
  input: RuntimeUpsertSubscriberInput,
): Promise<RuntimeUpsertSubscriberResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await selectRows<SubscriberRow>("subscribers", {
    select: "id,email,locale,confirmed_at,confirm_token",
    email: `eq.${email}`,
    limit: 1,
  });
  const row = existing[0];
  if (row) {
    if (row.confirmed_at) {
      return { alreadyConfirmed: true, confirmToken: row.confirm_token ?? input.confirmToken };
    }
    await updateRows(
      "subscribers",
      { id: `eq.${row.id}` },
      {
        confirm_token: input.confirmToken,
        whatsapp_number: input.whatsappNumber ?? null,
        locale: input.locale ?? "id",
        source: input.source ?? null,
        consent_marketing: input.consentMarketing,
        consent_at: new Date().toISOString(),
        ip: input.ip ?? null,
        country: input.country ?? null,
        user_agent: input.userAgent ?? null,
        unsubscribed_at: null,
      },
      { returning: false },
    );
    return { alreadyConfirmed: false, confirmToken: input.confirmToken };
  }

  await insertRows(
    "subscribers",
    {
      email,
      whatsapp_number: input.whatsappNumber ?? null,
      locale: input.locale ?? "id",
      source: input.source ?? null,
      consent_marketing: input.consentMarketing,
      consent_at: new Date().toISOString(),
      ip: input.ip ?? null,
      country: input.country ?? null,
      user_agent: input.userAgent ?? null,
      confirm_token: input.confirmToken,
    },
    { returning: false },
  );
  return { alreadyConfirmed: false, confirmToken: input.confirmToken };
}

export async function confirmRuntimeSubscriber(
  token: string,
): Promise<RuntimeConfirmedSubscriber | null> {
  if (!token) return null;
  const updated = await updateRows<SubscriberRow>(
    "subscribers",
    { confirm_token: `eq.${token}`, confirmed_at: "is.null" },
    { confirmed_at: new Date().toISOString() },
  );
  const row =
    updated[0] ??
    (
      await selectRows<SubscriberRow>("subscribers", {
        select: "id,email,locale,confirmed_at,confirm_token",
        confirm_token: `eq.${token}`,
        limit: 1,
      })
    )[0];
  return row ? { id: row.id, email: row.email, locale: row.locale } : null;
}

export async function unsubscribeRuntimeByToken(token: string): Promise<boolean> {
  if (!token) return false;
  const rows = await updateRows<{ id: number }>(
    "subscribers",
    { confirm_token: `eq.${token}` },
    { unsubscribed_at: new Date().toISOString(), consent_marketing: false },
  );
  return rows.length > 0;
}
