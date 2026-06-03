import { forecastMatch, forecastSummary, type MatchForecast, type TeamForm } from "@skorly/predict-model";
import {
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
  userId: string;
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

export interface RuntimeTeamOption {
  id: number;
  name: string;
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
  created_at: string | null;
}

interface CommentLikeRow {
  comment_id: number;
  user_id: string;
}

interface SubscriberRow {
  id: number;
  email: string;
  locale: string;
  confirmed_at: string | null;
  confirm_token: string | null;
}

const FIXTURE_SELECT =
  "id,slug,round,group_name,stage,kickoff_at,venue,city,status,home_goals,away_goals,elapsed,home_team_id,away_team_id";
const TEAM_SELECT = "id,name,slug,logo,code";
const BRACKET_SLUG = "wc2026-bracket";

function safeDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
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
  if (locale !== "id" || !/\bASI\b/.test(title)) return title;
  const context = `${slug} ${body ?? ""}`.toLowerCase();
  if (!/\b(usa|united states|amerika serikat)\b/.test(context)) return title;
  return title.replace(/\bASI\b/g, "Amerika Serikat");
}

function localizeArticleSummary(locale: string, summary: string | null, body?: string | null): string | null {
  if (locale === "en" || !body) return summary;
  return excerptFromBody(body, summary);
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
    select: "id,display_name,avatar_url",
    id: inFilter(clean),
  });
  return new Map(rows.map((r) => [r.id, r]));
}

function toFixture(row: FixtureRow, teams: Map<number, TeamRow>): RuntimeFixtureView {
  const home = row.home_team_id == null ? undefined : teams.get(row.home_team_id);
  const away = row.away_team_id == null ? undefined : teams.get(row.away_team_id);
  return {
    id: row.id,
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
      userId: r.user_id,
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

export async function getRuntimeTeamOptions(): Promise<RuntimeTeamOption[]> {
  const rows = await selectRows<{ id: number; name: string; is_national: boolean }>("teams", {
    select: "id,name,is_national",
    order: "is_national.desc,name.asc",
  });
  return rows.map((r) => ({ id: r.id, name: r.name }));
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
  });
  if (count >= 3) {
    await updateRows("comments", { id: `eq.${commentId}` }, { is_hidden: true }, { returning: false });
  }
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
