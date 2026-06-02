-- ============================================================
-- Skorly 二期 · M3 — Web Push subscriptions (PWA notifications)
-- Apply to the live project via Supabase MCP (apply_migration:
-- "phase2_m3_push_subscriptions"). Kept here as committed history.
--
-- One row per browser push subscription (W3C Push API). user_id is
-- nullable so anonymous visitors can subscribe to kickoff/goal alerts;
-- backfilled on login. keys holds the p256dh/auth pair for web-push.
-- Idempotent: IF NOT EXISTS.
-- ============================================================
create table if not exists push_subscriptions (
  id                serial primary key,
  endpoint          text not null unique,
  keys              jsonb not null,
  user_id           uuid references profiles(id),
  locale            text not null default 'id',
  kickoff           boolean not null default true,
  goals             boolean not null default true,
  prediction_result boolean not null default true,
  user_agent        text,
  failure_count     integer not null default 0,
  created_at        timestamptz not null default now(),
  last_sent_at      timestamptz
);

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);
