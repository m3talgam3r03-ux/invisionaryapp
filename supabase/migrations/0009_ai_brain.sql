-- ============================================================================
-- Invisionary — Migrazione 0009: cervello AI (retrieval per dominio).
-- Prerequisito: 0005_rag.sql (tabella `documents`, pgvector).
--
-- Aggiunge:
--  · colonna generata `domain` (da metadata->>'domain') + indice;
--  · `match_knowledge()`: ricerca coseno con boost sui domini pertinenti
--    alla domanda (il router lato Edge Function passa `boost_domains`);
--  · vincolo di unicità logica per il re-ingest per sorgente.
-- Idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Dominio del chunk: vendita | marketing | network | investimenti | trading |
-- mindset | piattaforma | compliance | metodo
-- ----------------------------------------------------------------------------
alter table public.documents
  add column if not exists domain text
  generated always as (metadata->>'domain') stored;

comment on column public.documents.domain is
  'Dominio di competenza del chunk, derivato da metadata->>''domain''. Usato per il boost nel retrieval.';

create index if not exists documents_domain_idx on public.documents (domain);
create index if not exists documents_source_idx on public.documents (source);

-- ----------------------------------------------------------------------------
-- Ricerca con boost di dominio.
-- score = similarità coseno + boost_weight se il chunk appartiene a uno dei
-- domini rilevati nella domanda. Un solo giro: niente fallback lato client.
-- ----------------------------------------------------------------------------
create or replace function public.match_knowledge(
  query_embedding vector(1024),
  match_count int default 6,
  similarity_threshold float default 0.18,
  boost_domains text[] default null,
  boost_weight float default 0.06
)
returns table (
  id uuid,
  source text,
  domain text,
  content text,
  similarity float,
  score float
)
language sql
stable
as $$
  select
    d.id,
    d.source,
    d.domain,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity,
    (1 - (d.embedding <=> query_embedding))
      + case
          when boost_domains is not null and d.domain = any (boost_domains) then boost_weight
          else 0
        end as score
  from public.documents d
  where d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) >= similarity_threshold
  order by score desc
  limit match_count;
$$;

grant execute on function public.match_knowledge(vector, int, float, text[], float)
  to authenticated, service_role;

-- Nota sul re-ingest: la cancellazione per sorgente (`replace: true`) avviene
-- nella Edge Function `ai-ingest`, che verifica il ruolo admin del chiamante e
-- poi usa la service_role (bypassa la RLS). Nessuna funzione SQL dedicata.
