-- =====================================================================
-- Guwahati Run: a "document" kind for event paperwork (invitation letter,
-- HOD approval, schedule...). Run once in Supabase:
--   SQL Editor -> New query -> paste all -> Run.   Safe to run again.
-- =====================================================================

alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents add constraint documents_kind_check
  check (kind in ('receipt', 'ticket', 'certificate', 'document', 'report'));

select 'Documents category ready' as status;
