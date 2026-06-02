-- ============================================================
-- Skorly 二期 · M4 — premium / subscribe (double opt-in + targeting)
-- Apply via Supabase MCP (apply_migration: "phase2_m4_premium").
--
-- confirm_token: double opt-in + one-click unsubscribe token.
-- premium_emailed_at: per-fixture dedupe so the pre-match premium
-- broadcast cron only emails a fixture's plan once.
-- Idempotent: IF NOT EXISTS.
-- ============================================================
alter table subscribers add column if not exists confirm_token text;
alter table fixtures    add column if not exists premium_emailed_at timestamptz;

create index if not exists subscribers_confirm_token_idx on subscribers (confirm_token);
