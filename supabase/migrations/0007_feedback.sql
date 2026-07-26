-- ============================================================================
-- Invisionary — Migrazione 0007: Community (feedback con foto).
-- Prerequisito: 0001_init.sql (feedback_posts già predisposta).
-- Idempotente.
-- ============================================================================

-- Nome autore denormalizzato: il feed è visibile a tutta la rete, ma la RLS su
-- profiles limita i join; salviamo il nome direttamente sul post.
alter table public.feedback_posts add column if not exists author_name text;

-- Lettura del feed: tutti gli autenticati (community). Scrittura: owner/admin (da 0001).
drop policy if exists feedback_posts_select on public.feedback_posts;
create policy feedback_posts_select on public.feedback_posts
  for select using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- Storage: bucket pubblico per le foto dei feedback.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('feedback', 'feedback', true)
on conflict (id) do nothing;

-- Upload: solo autenticati, nel bucket 'feedback'.
drop policy if exists "feedback objects insert" on storage.objects;
create policy "feedback objects insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'feedback');

-- Lettura pubblica del bucket (foto visibili nel feed).
drop policy if exists "feedback objects read" on storage.objects;
create policy "feedback objects read" on storage.objects
  for select using (bucket_id = 'feedback');

-- Eliminazione: solo il proprietario del file (o admin).
drop policy if exists "feedback objects delete" on storage.objects;
create policy "feedback objects delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'feedback' and owner = auth.uid());
