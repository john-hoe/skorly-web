-- ============================================================
-- Skorly 二期 · M3 — push notification dedupe columns
-- Apply to the live project via Supabase MCP (apply_migration:
-- "phase2_m3_notify_dedupe"). Kept here as committed history.
--
-- These nullable timestamps let the notify cron run idempotently:
-- a row is only pushed once its *_notified_at is null, then stamped.
-- Idempotent: IF NOT EXISTS.
-- ============================================================
alter table fixtures       add column if not exists notified_kickoff_at timestamptz;
alter table fixture_events add column if not exists notified_at         timestamptz;
alter table predictions    add column if not exists result_notified_at  timestamptz;
