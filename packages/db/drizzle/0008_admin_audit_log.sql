-- ============================================================
-- Skorly admin foundation — audit log for privileged actions.
-- Apply via Supabase MCP / SQL editor / psql before enabling admin writes.
--
-- Idempotent: IF NOT EXISTS.
-- ============================================================

create table if not exists admin_audit_log (
  id serial primary key,
  actor_id uuid not null references profiles(id),
  action text not null,
  target text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_actor_idx
  on admin_audit_log (actor_id, created_at);

create index if not exists admin_audit_log_target_idx
  on admin_audit_log (target, created_at);

alter table admin_audit_log enable row level security;
comment on table admin_audit_log is
  'Server-side admin audit log. RLS intentionally has no public policies; access is via direct server Postgres only.';

create table if not exists job_locks (
  name text primary key,
  owner text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table job_locks enable row level security;
comment on table job_locks is
  'Server-side short TTL job leases. RLS intentionally has no public policies; access is via direct server Postgres only.';
