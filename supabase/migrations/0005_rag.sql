-- ============================================================================
-- Invisionary — Migrazione 0005: RAG (pgvector) per l'agente AI.
-- Prerequisito: 0001_init.sql (is_admin()).
-- Embedding: Voyage `voyage-3.5` a 1024 dimensioni (deve combaciare con vector(1024)).
-- Idempotente.
-- ============================================================================

create extension if not exists vector;

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  source      text,
  content     text not null,
  metadata    jsonb not null default '{}'::jsonb,
  embedding   vector(1024),
  created_at  timestamptz not null default now()
);

comment on table public.documents is 'Base di conoscenza per il RAG dell''agente AI (chunk + embedding Voyage 1024d).';

-- Indice ANN coseno (HNSW).
create index if not exists documents_embedding_idx
  on public.documents using hnsw (embedding vector_cosine_ops);

alter table public.documents enable row level security;

-- Lettura per gli autenticati; scrittura solo admin.
-- (L'ingest e la ricerca lato Edge Function usano la service_role, che bypassa la RLS.)
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select using (auth.uid() is not null);

drop policy if exists documents_write on public.documents;
create policy documents_write on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.documents to authenticated;

-- ----------------------------------------------------------------------------
-- Ricerca per similarità coseno.
-- ----------------------------------------------------------------------------
create or replace function public.match_documents(
  query_embedding vector(1024),
  match_count int default 5,
  similarity_threshold float default 0.0
)
returns table (id uuid, source text, content text, similarity float)
language sql
stable
as $$
  select
    d.id,
    d.source,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) >= similarity_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_documents(vector, int, float) to authenticated, service_role;
