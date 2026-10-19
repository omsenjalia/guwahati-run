-- =====================================================================
-- Guwahati Run: past runs of our trains, for the "Avg delay" view on
-- Train status. One row per train per start date, with how late it was
-- at each stop. Written by the server only.
-- Run once in Supabase: SQL Editor -> New query -> paste all -> Run.
-- Safe to run again.
-- =====================================================================

create table if not exists public.train_runs (
  train text not null,
  -- YYYY-MM-DD the train left its origin
  start_date date not null,
  -- Minutes late at each passed stop, e.g. {"NDLS": 12, "CNB": 25}
  delays jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (train, start_date)
);

-- No policies: only the server (secret key) reads and writes this.
alter table public.train_runs enable row level security;

select 'Train runs table ready' as status;
