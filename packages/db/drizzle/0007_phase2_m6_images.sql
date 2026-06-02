-- ============================================================
-- Skorly 二期 · M6 — match posters + team identity registry
-- Apply via Supabase MCP (apply_migration: "phase2_m6_images").
--
-- image_library: add the match-poster pipeline columns. Posters are
-- enqueued (status=pending + prompt) by the cron, then fulfilled by the
-- local GPT-Image skill which fills `url` and flips status=ready.
-- team_identities: parametric inputs for the GPT-Image poster templates.
-- Idempotent: IF NOT EXISTS.
-- ============================================================

-- image_library: url becomes nullable (pending rows have no url yet).
alter table image_library alter column url drop not null;
alter table image_library add column if not exists fixture_id integer references fixtures(id);
alter table image_library add column if not exists kind text not null default 'generic';
alter table image_library add column if not exists variant text;
alter table image_library add column if not exists prompt text;
alter table image_library add column if not exists status text not null default 'ready';

create unique index if not exists image_library_fixture_kind_idx
  on image_library (fixture_id, kind, variant);

-- team identity registry
create table if not exists team_identities (
  id serial primary key,
  team_id integer not null references teams(id),
  alias text,
  totem_animal text,
  primary_color text,
  secondary_color text,
  flag_emoji text,
  star_player text,
  star_number integer,
  updated_at timestamptz not null default now()
);

create unique index if not exists team_identities_team_idx on team_identities (team_id);
