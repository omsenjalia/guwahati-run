-- =====================================================================
-- Guwahati Run: shared expenses (who paid what, who owes whom).
-- Run once in Supabase: SQL Editor -> New query -> paste all -> Run.
-- Safe to run again.
-- =====================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric(10, 2) not null check (amount > 0),
  -- Person id who paid: heet, omk, oms, sujal
  paid_by text not null,
  -- Who shares it equally (default: all four)
  split_between text[] not null default array['heet', 'omk', 'oms', 'sujal'],
  -- tickets, registration, travel, food, stay, other, settlement
  category text not null default 'other',
  spent_on date not null default (now() at time zone 'Asia/Kolkata')::date,
  -- Photo of the bill in the private trip-files bucket (for the grant claim)
  receipt_path text,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_spent_on on public.expenses (spent_on desc, created_at desc);

alter table public.expenses enable row level security;
drop policy if exists team_all on public.expenses;
create policy team_all on public.expenses for all to authenticated
  using (public.gr_is_team()) with check (public.gr_is_team());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expenses'
  ) then
    alter publication supabase_realtime add table public.expenses;
  end if;
end $$;

select 'Expenses table ready' as status;
