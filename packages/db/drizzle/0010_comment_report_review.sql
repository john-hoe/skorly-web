-- ============================================================
-- Skorly admin comments — report review state.
-- Apply via Supabase MCP / SQL editor / psql before enabling the admin
-- moderation page.
--
-- Existing comments already have comments.is_hidden. This migration adds
-- explicit review state to reports so admins can clear handled items.
-- ============================================================

alter table comment_reports
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null;

create index if not exists comment_reports_review_idx
  on comment_reports (reviewed_at, created_at);

create index if not exists comment_reports_comment_review_idx
  on comment_reports (comment_id, reviewed_at);
