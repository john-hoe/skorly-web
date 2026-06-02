-- ============================================================
-- Skorly 二期 · M0 — Supabase Auth identity migration
-- Applied to the live project via Supabase MCP (apply_migration:
-- "phase2_m0_identity_profiles"). Kept here as committed history.
--
-- Replaces the self-rolled `users/accounts/sessions/verification_tokens`
-- tables with a `profiles` table mirroring `auth.users` (Supabase Auth owns
-- password / OAuth / email-verify / reset). All `user_id` FKs become uuid.
-- Phase 0 has no real members, so empty + retype is safe.
-- ============================================================

-- 1) profiles mirrors auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  whatsapp_number text,
  locale text not null default 'id',
  favorite_team_id integer references public.teams(id),
  role text not null default 'member',
  consent_marketing boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists profiles_email_idx on public.profiles(email);

-- 2) auto-provision a profile whenever an auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, locale, consent_marketing, consent_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'locale', 'id'),
    coalesce((new.raw_user_meta_data->>'consent_marketing')::boolean, false),
    case when (new.raw_user_meta_data->>'consent_marketing')::boolean then now() else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) drop every FK that points at legacy public.users, then retype user_id -> uuid
do $$
declare r record;
begin
  if to_regclass('public.users') is not null then
    for r in
      select conrelid::regclass as tbl, conname
      from pg_constraint
      where confrelid = 'public.users'::regclass and contype = 'f'
    loop
      execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    end loop;
  end if;
end $$;

truncate table public.predictions, public.comments, public.comment_likes, public.comment_reports, public.winners restart identity cascade;
delete from public.campaign_entries where user_id is not null;

alter table public.predictions     alter column user_id type uuid using null;
alter table public.comments         alter column user_id type uuid using null;
alter table public.comment_likes    alter column user_id type uuid using null;
alter table public.comment_reports  alter column user_id type uuid using null;
alter table public.campaign_entries alter column user_id type uuid using null;
alter table public.winners          alter column user_id type uuid using null;

-- 4) re-point FKs to profiles
alter table public.predictions     add constraint predictions_user_id_profiles_id_fk     foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.comments         add constraint comments_user_id_profiles_id_fk         foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.comment_likes    add constraint comment_likes_user_id_profiles_id_fk    foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.comment_reports  add constraint comment_reports_user_id_profiles_id_fk  foreign key (user_id) references public.profiles(id) on delete set null;
alter table public.campaign_entries add constraint campaign_entries_user_id_profiles_id_fk foreign key (user_id) references public.profiles(id) on delete set null;
alter table public.winners          add constraint winners_user_id_profiles_id_fk          foreign key (user_id) references public.profiles(id) on delete set null;

-- 5) drop legacy auth tables (Supabase Auth owns identity now)
drop table if exists public.sessions cascade;
drop table if exists public.accounts cascade;
drop table if exists public.verification_tokens cascade;
drop table if exists public.users cascade;

-- 6) RLS on profiles (service-role/postgres bypasses; clients least-privilege)
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
