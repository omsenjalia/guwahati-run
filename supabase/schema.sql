-- =====================================================================
-- Guwahati Run: complete database setup. Run once in Supabase:
--   Dashboard -> SQL Editor -> New query -> paste all -> Run.
-- Safe to run again (everything is "if not exists" / replaceable).
--
-- Access model
--   * Phones never use the secret key. After the team passcode, the app
--     signs each phone into a shared Supabase user whose JWT carries
--     app_metadata.role = 'team'. Row Level Security only lets that role in.
--   * Background jobs run on the server with the secret key (bypasses RLS).
--   * The publishable key alone can read nothing.
-- =====================================================================

-- ------------------------------------------------------------ extensions
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- True when the caller is a signed-in team phone.
create or replace function public.gr_is_team() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'team'
$$;

-- ---------------------------------------------------------------- tables

-- Copy of data/trip.ts, written by the server on first run and on change.
create table if not exists public.trip_snapshot (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Latest live state per leg (PNR status, berths, delays, platform...).
create table if not exists public.leg_live (
  leg_id text primary key,
  data jsonb not null default '{}'::jsonb,
  source text,
  stale boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Every PNR change, for the waitlist movement graph.
create table if not exists public.pnr_history (
  id bigint generated always as identity primary key,
  leg_id text not null,
  pnr text not null,
  fetched_at timestamptz not null default now(),
  chart_prepared boolean,
  passengers jsonb not null,
  source text
);
create index if not exists pnr_history_leg_time on public.pnr_history (leg_id, fetched_at desc);

-- Hidden admin override for emergencies (merged over leg_live).
create table if not exists public.overrides (
  leg_id text primary key,
  data jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);

-- Small computed things: weather, connection risk, transfer plans,
-- deadline verdicts, morning briefing, Splitwise balances...
create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- System health: one row per background job run.
create table if not exists public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  message text,
  source text,
  details jsonb
);
create index if not exists job_runs_job_time on public.job_runs (job, started_at desc);

-- Web Push subscriptions, one per phone/browser.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  person text,
  keys jsonb not null,
  muted text[] not null default '{}',
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);

-- Every alert sent through notify() (push now, WhatsApp later).
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  kind text not null,
  title text not null,
  body text,
  url text,
  tag text,
  data jsonb,
  delivered int not null default 0,
  failed int not null default 0,
  created_at timestamptz not null default now()
);

-- "I'm here" check-ins.
create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  person text not null,
  place text,
  note text,
  lat double precision,
  lon double precision,
  created_at timestamptz not null default now()
);

-- Optional live location sharing (latest point per person).
create table if not exists public.locations (
  person text primary key,
  lat double precision not null,
  lon double precision not null,
  accuracy double precision,
  updated_at timestamptz not null default now()
);

-- Shared and per-person packing lists. owner = 'team' or a person id.
create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  owner text not null default 'team',
  label text not null,
  done boolean not null default false,
  done_by text,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

-- Hackathon kanban.
create table if not exists public.board_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trip journal: notes and photos per day.
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  author text not null,
  body text,
  photo_path text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------- row level security

do $$
declare t text;
begin
  foreach t in array array[
    'trip_snapshot','leg_live','pnr_history','overrides','app_state','job_runs',
    'push_subscriptions','notifications','checkins','locations','packing_items',
    'board_cards','journal_entries'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Team phones can read these (server writes them).
do $$
declare t text;
begin
  foreach t in array array[
    'trip_snapshot','leg_live','pnr_history','overrides','app_state','job_runs','notifications'
  ] loop
    execute format('drop policy if exists team_read on public.%I', t);
    execute format('create policy team_read on public.%I for select to authenticated using (public.gr_is_team())', t);
  end loop;
end $$;

-- Team phones can read and write these directly.
do $$
declare t text;
begin
  foreach t in array array['checkins','locations','packing_items','board_cards','journal_entries'] loop
    execute format('drop policy if exists team_all on public.%I', t);
    execute format(
      'create policy team_all on public.%I for all to authenticated using (public.gr_is_team()) with check (public.gr_is_team())', t);
  end loop;
end $$;
-- push_subscriptions: no client policy at all; only the server touches it.

-- ------------------------------------------------------------- realtime

do $$
declare t text;
begin
  foreach t in array array[
    'leg_live','app_state','pnr_history','job_runs','notifications',
    'checkins','locations','packing_items','board_cards','journal_entries'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------- file storage (private)
-- Journal photos and ticket PDFs. Never ID documents.
insert into storage.buckets (id, name, public)
values ('trip-files', 'trip-files', false)
on conflict (id) do nothing;

drop policy if exists "trip files team read" on storage.objects;
create policy "trip files team read" on storage.objects for select to authenticated
  using (bucket_id = 'trip-files' and public.gr_is_team());
drop policy if exists "trip files team write" on storage.objects;
create policy "trip files team write" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-files' and public.gr_is_team());
drop policy if exists "trip files team delete" on storage.objects;
create policy "trip files team delete" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-files' and public.gr_is_team());

-- ------------------------------------------------- background scheduler
-- Every 5 minutes Supabase pings the app's /api/jobs/tick endpoint, which
-- decides which jobs are due (PNR sync, live status, weather, deadlines...).
-- The app registers its own URL after its first deploy, so nothing to edit here.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_config (
  id int primary key default 1 check (id = 1),
  base_url text,
  cron_secret text not null
);

insert into private.app_config (id, cron_secret)
values (1, 'MGkLnw1f3958h3gVEIBGQ-kvYWrr6cy2')
on conflict (id) do update set cron_secret = excluded.cron_secret;

-- Called by the app (secret key only) to register where it is deployed.
create or replace function public.gr_set_base_url(url text) returns void
language sql security definer set search_path = private, public as $$
  update private.app_config set base_url = rtrim(url, '/') where id = 1;
$$;
revoke execute on function public.gr_set_base_url(text) from public, anon, authenticated;
grant execute on function public.gr_set_base_url(text) to service_role;

create or replace function private.gr_tick() returns void
language plpgsql security definer set search_path = private, public, extensions as $$
declare cfg private.app_config;
begin
  select * into cfg from private.app_config where id = 1;
  if cfg.base_url is null then
    return; -- app not deployed yet
  end if;
  perform net.http_post(
    url := cfg.base_url || '/api/jobs/tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || cfg.cron_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
end $$;

-- (Re)create the schedule.
select cron.unschedule(jobid) from cron.job where jobname = 'guwahati-run-tick';
select cron.schedule('guwahati-run-tick', '*/5 * * * *', $$ select private.gr_tick() $$);

-- Keep logs small: drop job history older than 14 days, daily at 03:30 UTC.
select cron.unschedule(jobid) from cron.job where jobname = 'guwahati-run-cleanup';
select cron.schedule('guwahati-run-cleanup', '30 3 * * *', $$
  delete from public.job_runs where started_at < now() - interval '14 days';
  delete from net._http_response where created < now() - interval '2 days';
$$);

select 'Guwahati Run database ready' as status;
