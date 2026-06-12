import {
  pgTable,
  pgEnum,
  serial,
  integer,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

export const articleType = pgEnum("article_type", [
  "preview",
  "watchpoints",
  "prediction",
  "recap",
  "tactical",
  "group_analysis",
  "news",
]);

export const signalSource = pgEnum("signal_source", [
  "socialdata",
  "rss",
  "api_football",
  "dongqiudi",
  "zhibo8",
]);

export const topicStatus = pgEnum("topic_status", [
  "pending", // detected, not yet written
  "writing", // generation in progress
  "done", // article(s) produced
  "skipped", // deduped or below heat threshold
]);

export const articleStatus = pgEnum("article_status", ["draft", "published"]);

export const fixtureStatus = pgEnum("fixture_status", [
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
]);

export const campaignType = pgEnum("campaign_type", [
  "subscribe",
  "predict",
  "lottery",
  "referral",
]);

/* ------------------------------------------------------------------ */
/* Phase 0 - core football data                                       */
/* ------------------------------------------------------------------ */

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  apiId: integer("api_id").notNull().unique(), // API-Football league id
  name: text("name").notNull(),
  type: text("type"), // 'Cup' | 'League'
  country: text("country"),
  logo: text("logo"),
  season: integer("season"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    apiId: integer("api_id").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    code: text("code"), // e.g. BRA
    country: text("country"),
    logo: text("logo"),
    isNational: boolean("is_national").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("teams_slug_idx").on(t.slug)]
);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    apiId: integer("api_id").notNull().unique(),
    teamId: integer("team_id").references(() => teams.id),
    name: text("name").notNull(),
    position: text("position"),
    number: integer("number"),
    age: integer("age"),
    nationality: text("nationality"),
    photo: text("photo"),
  },
  (t) => [index("players_team_idx").on(t.teamId)]
);

export const fixtures = pgTable(
  "fixtures",
  {
    id: serial("id").primaryKey(),
    apiId: integer("api_id").notNull().unique(),
    leagueId: integer("league_id").references(() => leagues.id),
    slug: text("slug").notNull(),
    round: text("round"), // e.g. "Group A - 1"
    groupName: text("group_name"), // A..L
    stage: text("stage"), // 'group' | 'round_of_32' | ...
    homeTeamId: integer("home_team_id").references(() => teams.id),
    awayTeamId: integer("away_team_id").references(() => teams.id),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }),
    venue: text("venue"),
    city: text("city"),
    status: fixtureStatus("status").default("scheduled").notNull(),
    homeGoals: integer("home_goals"),
    awayGoals: integer("away_goals"),
    elapsed: integer("elapsed"), // live minute
    raw: jsonb("raw"), // last raw API payload for debugging
    notifiedKickoffAt: timestamp("notified_kickoff_at", { withTimezone: true }), // push dedupe
    premiumEmailedAt: timestamp("premium_emailed_at", { withTimezone: true }), // pre-match email dedupe
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("fixtures_slug_idx").on(t.slug),
    index("fixtures_kickoff_idx").on(t.kickoffAt),
    index("fixtures_group_idx").on(t.groupName),
  ]
);

/** Goal/card/sub events used to feed recaps + live text updates (Phase 1.6). */
export const fixtureEvents = pgTable(
  "fixture_events",
  {
    id: serial("id").primaryKey(),
    fixtureId: integer("fixture_id")
      .references(() => fixtures.id)
      .notNull(),
    minute: integer("minute"),
    type: text("type"), // 'Goal' | 'Card' | 'subst'
    detail: text("detail"),
    teamId: integer("team_id").references(() => teams.id),
    playerName: text("player_name"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }), // push dedupe (goals)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("fixture_events_fixture_idx").on(t.fixtureId)]
);

/** Group standings (membership now, live table during tournament). */
export const standings = pgTable(
  "standings",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id").references(() => leagues.id),
    groupName: text("group_name").notNull(), // "Group A" .. "Group L"
    teamId: integer("team_id")
      .references(() => teams.id)
      .notNull(),
    rank: integer("rank"),
    played: integer("played").default(0).notNull(),
    win: integer("win").default(0).notNull(),
    draw: integer("draw").default(0).notNull(),
    lose: integer("lose").default(0).notNull(),
    goalsFor: integer("goals_for").default(0).notNull(),
    goalsAgainst: integer("goals_against").default(0).notNull(),
    points: integer("points").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("standings_group_team_idx").on(t.groupName, t.teamId),
    index("standings_group_idx").on(t.groupName),
  ]
);

/* ------------------------------------------------------------------ */
/* Phase 0 - AI content                                               */
/* ------------------------------------------------------------------ */

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    locale: text("locale").notNull().default("id"), // id | vi | en | zh
    type: articleType("type").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body").notNull(), // markdown
    fixtureId: integer("fixture_id").references(() => fixtures.id),
    teamId: integer("team_id").references(() => teams.id),
    groupName: text("group_name"),
    topicId: integer("topic_id"), // FK set after topics table; news articles
    imageUrl: text("image_url"), // own/licensed cover image (R2)
    sources: jsonb("sources"), // string[] of source URLs (audit/attribution)
    embeds: jsonb("embeds"), // string[] of YouTube/X/Giphy embed URLs
    status: articleStatus("status").default("draft").notNull(),
    qualityScore: integer("quality_score"),
    qaLog: jsonb("qa_log"), // per-round judge scores for prompt tuning
    model: text("model"), // which LLM produced it
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("articles_slug_locale_idx").on(t.slug, t.locale),
    index("articles_status_idx").on(t.status, t.locale),
    index("articles_fixture_idx").on(t.fixtureId),
    index("articles_type_idx").on(t.type),
  ]
);

/* ------------------------------------------------------------------ */
/* Phase 0 - lead capture                                             */
/* ------------------------------------------------------------------ */

export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    whatsappNumber: text("whatsapp_number"),
    locale: text("locale").notNull().default("id"),
    source: text("source"), // homepage | match_page | article_page | campaign:xxx
    consentMarketing: boolean("consent_marketing").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    country: text("country"),
    userAgent: text("user_agent"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }), // double opt-in
    confirmToken: text("confirm_token"), // double opt-in / unsubscribe token
    giftSent: boolean("gift_sent").default(false).notNull(),
    giftSentAt: timestamp("gift_sent_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("subscribers_locale_idx").on(t.locale, t.createdAt),
    index("subscribers_consent_idx").on(t.consentMarketing, t.unsubscribedAt),
  ]
);

/* ------------------------------------------------------------------ */
/* Phase 1 (二期) - identity                                          */
/* ------------------------------------------------------------------ */

/**
 * Public profile mirror of `auth.users` (managed by Supabase Auth).
 * - Password / OAuth / email-verify / reset are all handled by Supabase Auth.
 * - `id` equals `auth.users.id` (uuid); a DB trigger auto-creates a row on signup.
 * - `role` drives premium gating (M4): member | premium | admin.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(), // = auth.users.id (FK added in migration SQL)
    email: text("email"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    whatsappNumber: text("whatsapp_number"),
    locale: text("locale").notNull().default("id"),
    favoriteTeamId: integer("favorite_team_id").references(() => teams.id),
    role: text("role").notNull().default("member"), // member | premium | admin
    consentMarketing: boolean("consent_marketing").default(false).notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    badges: jsonb("badges").notNull().default([]), // ProfileBadge[] (D4 awards)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("profiles_email_idx").on(t.email)]
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: serial("id").primaryKey(),
    actorId: uuid("actor_id")
      .references(() => profiles.id)
      .notNull(),
    action: text("action").notNull(),
    target: text("target").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("admin_audit_log_actor_idx").on(t.actorId, t.createdAt),
    index("admin_audit_log_target_idx").on(t.target, t.createdAt),
  ]
);

export const jobLocks = pgTable("job_locks", {
  name: text("name").primaryKey(),
  owner: text("owner").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Phase 1 - comments                                                 */
/* ------------------------------------------------------------------ */

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .references(() => profiles.id)
      .notNull(),
    articleId: integer("article_id").references(() => articles.id),
    fixtureId: integer("fixture_id").references(() => fixtures.id),
    parentId: integer("parent_id"), // 1-level nesting; self-ref set in relations
    body: text("body").notNull(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("comments_article_idx").on(t.articleId),
    index("comments_fixture_idx").on(t.fixtureId),
  ]
);

export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: integer("comment_id")
      .references(() => comments.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => profiles.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })]
);

export const commentReports = pgTable("comment_reports", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id")
    .references(() => comments.id)
    .notNull(),
  userId: uuid("user_id").references(() => profiles.id),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
}, (t) => [
  index("comment_reports_review_idx").on(t.reviewedAt, t.createdAt),
  index("comment_reports_comment_review_idx").on(t.commentId, t.reviewedAt),
]);

/* ------------------------------------------------------------------ */
/* Phase 1.3 - campaigns + predict & win                              */
/* ------------------------------------------------------------------ */

export const campaigns = pgTable(
  "campaigns",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    type: campaignType("type").notNull(),
    name: jsonb("name").notNull(), // { id, vi, en }
    description: jsonb("description"),
    rules: jsonb("rules"),
    prizes: jsonb("prizes"),
    locales: text("locales").array(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const campaignEntries = pgTable(
  "campaign_entries",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .references(() => campaigns.id)
      .notNull(),
    userId: uuid("user_id").references(() => profiles.id),
    subscriberId: integer("subscriber_id").references(() => subscribers.id),
    data: jsonb("data"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("campaign_entries_campaign_idx").on(t.campaignId)]
);

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .references(() => profiles.id)
      .notNull(),
    fixtureId: integer("fixture_id")
      .references(() => fixtures.id)
      .notNull(),
    homeGoalsPred: integer("home_goals_pred").notNull(),
    awayGoalsPred: integer("away_goals_pred").notNull(),
    pointsAwarded: integer("points_awarded"),
    resultNotifiedAt: timestamp("result_notified_at", { withTimezone: true }), // push dedupe
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("predictions_user_fixture_idx").on(t.userId, t.fixtureId)]
);

export const winners = pgTable("winners", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  userId: uuid("user_id").references(() => profiles.id),
  prizeLabel: text("prize_label"),
  rank: integer("rank"),
  awardedAt: timestamp("awarded_at", { withTimezone: true }),
});

/* ------------------------------------------------------------------ */
/* Phase 2 - news pipeline (signals -> topics -> original articles)   */
/* ------------------------------------------------------------------ */

/**
 * Raw signals/leads. We store ONLY lead metadata (title/url/entities), never
 * the full body of third-party content. URL is for dedup + attribution audit.
 */
export const newsSignals = pgTable(
  "news_signals",
  {
    id: serial("id").primaryKey(),
    source: signalSource("source").notNull(),
    url: text("url").notNull().unique(),
    externalId: text("external_id"), // tweet id / guid, for incremental polling
    author: text("author"), // e.g. tweet author handle
    title: text("title").notNull(), // headline or tweet text snippet (lead only)
    lang: text("lang"),
    entities: jsonb("entities"), // { teams: string[], players: string[] }
    hasMedia: boolean("has_media").default(false).notNull(),
    embedUrl: text("embed_url"), // canonical embeddable URL if media present
    topicId: integer("topic_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("news_signals_source_idx").on(t.source, t.publishedAt),
    index("news_signals_topic_idx").on(t.topicId),
  ]
);

/** Deduped event/topic clustered from one or more signals. */
export const topics = pgTable(
  "topics",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(), // stable dedup key (normalized)
    title: text("title").notNull(),
    entities: jsonb("entities"), // { teams, players }
    factSheet: jsonb("fact_sheet"), // [{ fact, sourceUrl }]
    heat: integer("heat").default(0).notNull(), // ranking score
    signalCount: integer("signal_count").default(1).notNull(),
    status: topicStatus("status").default("pending").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("topics_status_heat_idx").on(t.status, t.heat),
  ]
);

/** Reusable, watermarked cover-image library (R2 URLs), keyed by team/category. */
export const imageLibrary = pgTable(
  "image_library",
  {
    id: serial("id").primaryKey(),
    team: text("team"), // nullable: generic category image
    category: text("category").notNull(), // transfer|injury|preview|result|tactical|generic
    url: text("url"), // R2/Storage public URL (watermarked). null while pending.
    // 二期 M6 — match poster pipeline (enqueue prompt -> local GPT-Image skill -> url)
    fixtureId: integer("fixture_id").references(() => fixtures.id),
    kind: text("kind").default("generic").notNull(), // prematch_poster|result_card|motm_card|generic
    variant: text("variant"), // star|totem|silhouette
    prompt: text("prompt"), // GPT-Image prompt to fulfill
    status: text("status").default("ready").notNull(), // pending|ready|failed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("image_library_lookup_idx").on(t.category, t.team),
    uniqueIndex("image_library_fixture_kind_idx").on(t.fixtureId, t.kind, t.variant),
  ]
);

/**
 * 二期 M6 — team identity registry. Parametric inputs for GPT-Image poster
 * templates so all 48 nations render in a consistent, batchable style:
 * alias, totem animal, kit colours, flag emoji, and the star player + number.
 */
export const teamIdentities = pgTable(
  "team_identities",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .references(() => teams.id)
      .notNull(),
    alias: text("alias"), // e.g. "La Albiceleste"
    totemAnimal: text("totem_animal"), // e.g. "condor"
    primaryColor: text("primary_color"), // hex
    secondaryColor: text("secondary_color"), // hex
    flagEmoji: text("flag_emoji"),
    starPlayer: text("star_player"),
    starNumber: integer("star_number"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("team_identities_team_idx").on(t.teamId)]
);

/* ------------------------------------------------------------------ */
/* 二期 M3 — Web Push subscriptions (PWA notifications)                */
/* ------------------------------------------------------------------ */

/**
 * One row per browser push subscription (W3C Push API). `userId` is nullable so
 * anonymous visitors can still subscribe to kickoff/goal alerts; once they log
 * in we backfill it. `keys` holds the p256dh/auth pair needed by web-push.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    endpoint: text("endpoint").notNull().unique(),
    keys: jsonb("keys").notNull(), // { p256dh: string, auth: string }
    userId: uuid("user_id").references(() => profiles.id),
    locale: text("locale").notNull().default("id"),
    // notification topic opt-ins
    kickoff: boolean("kickoff").default(true).notNull(),
    goals: boolean("goals").default(true).notNull(),
    predictionResult: boolean("prediction_result").default(true).notNull(),
    userAgent: text("user_agent"),
    failureCount: integer("failure_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)]
);

/* ------------------------------------------------------------------ */
/* 三期 D1 — live text commentary (match center)                       */
/* ------------------------------------------------------------------ */

/**
 * One commentary entry per match moment; `texts` maps locale → rendered line
 * so all four languages share a row. `dedupeKey` makes generation idempotent
 * across cron reruns. `sortKey` orders entries chronologically even when the
 * minute repeats (minute * 100 + sequence).
 */
export const liveCommentary = pgTable(
  "live_commentary",
  {
    id: serial("id").primaryKey(),
    fixtureId: integer("fixture_id")
      .references(() => fixtures.id)
      .notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    sortKey: integer("sort_key").notNull(),
    minute: integer("minute"),
    type: text("type").notNull(), // kickoff|halftime|fulltime|goal|red_card|yellow_card|substitution|var|stats|color
    texts: jsonb("texts").notNull(), // { id: string, vi: string, en: string, zh: string }
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("live_commentary_fixture_dedupe_idx").on(t.fixtureId, t.dedupeKey),
    index("live_commentary_fixture_sort_idx").on(t.fixtureId, t.sortKey),
  ]
);

/* ------------------------------------------------------------------ */
/* 三期 D3 — official highlight embeds (YouTube whitelist only)        */
/* ------------------------------------------------------------------ */

export const fixtureMedia = pgTable(
  "fixture_media",
  {
    id: serial("id").primaryKey(),
    fixtureId: integer("fixture_id")
      .references(() => fixtures.id)
      .notNull(),
    kind: text("kind").notNull().default("highlight"),
    provider: text("provider").notNull().default("youtube"),
    videoId: text("video_id").notNull(),
    title: text("title"),
    channelId: text("channel_id"),
    channelTitle: text("channel_title"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("fixture_media_unique_idx").on(t.fixtureId, t.provider, t.videoId),
    index("fixture_media_fixture_idx").on(t.fixtureId, t.kind),
  ]
);
