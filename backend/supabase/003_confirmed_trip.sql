-- =====================================================================
-- Guwahati Run: trip confirmed update (prep checklist, receipts in
-- GitHub, new expense categories). Run once in Supabase:
--   SQL Editor -> New query -> paste all -> Run.
-- Safe to run again.
-- =====================================================================

-- ------------------------------------------------------- prep checklist
-- Deadlines and per-person ticks on checklist items (owner = 'prep').
alter table public.packing_items add column if not exists due date;
alter table public.packing_items add column if not exists per_person boolean not null default false;
alter table public.packing_items add column if not exists done_people text[] not null default '{}';

-- -------------------------------------------------- expense categories
-- New set: train, metro, cab, food, accommodation, registration, other
-- (plus settlement for repayments).
update public.expenses set category = 'train' where category = 'tickets';
update public.expenses set category = 'cab' where category = 'travel';
update public.expenses set category = 'accommodation' where category = 'stay';

-- ------------------------------------------------------------ documents
-- Every file kept in the private GitHub repo (documents/ folder):
-- receipts (linked to an expense), tickets, certificates, reports.
-- Only the server writes here (it holds the GitHub token); phones read.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('receipt', 'ticket', 'certificate', 'report')),
  -- Path inside the repo, e.g. documents/receipts/2026-10-28/cab_420_heet_kamakhya-iit.jpg
  path text not null unique,
  -- Git blob SHA from GitHub (needed to update or delete the file)
  sha text not null,
  commit_sha text,
  mime text not null,
  size int not null,
  title text,
  expense_id uuid references public.expenses (id) on delete set null,
  leg_id text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_kind_time on public.documents (kind, created_at);
create index if not exists documents_expense on public.documents (expense_id);

alter table public.documents enable row level security;
drop policy if exists team_read on public.documents;
create policy team_read on public.documents for select to authenticated using (public.gr_is_team());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;
end $$;

-- Phones upload into trip-files/staging/ first (no 4.5 MB limit there);
-- the server copies the file to GitHub and deletes the staged copy.
update storage.buckets set file_size_limit = 20971520 where id = 'trip-files';

select 'Trip confirmed update ready' as status;
