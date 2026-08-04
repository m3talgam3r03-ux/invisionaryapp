-- ============================================================================
-- DOWN della migrazione 0017.
--
-- ⚠️ Si perdono stato, origine, tag e tutto lo storico dei passaggi di stato.
-- La metrica «clienti acquisiti» del rank torna a contare i clienti creati nel
-- periodo, senza distinguere chi è diventato cliente davvero.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

drop trigger if exists clients_log_stato_insert on public.clients;
drop trigger if exists clients_log_stato_update on public.clients;
drop trigger if exists clients_touch_contatto_trigger on public.clients;
drop function if exists public.clients_log_stato();
drop function if exists public.clients_touch_contatto();

drop policy if exists contact_status_history_select on public.contact_status_history;
drop table if exists public.contact_status_history;

drop index if exists public.clients_stato_idx;
drop index if exists public.clients_ultimo_contatto_idx;
drop index if exists public.clients_tags_idx;

alter table public.clients
  drop constraint if exists clients_stato_check,
  drop column if exists stato,
  drop column if exists origine,
  drop column if exists tags,
  drop column if exists ultimo_contatto_at;

-- La matview torna alla definizione di 0015.
drop materialized view if exists public.mv_rank_metriche;
create materialized view public.mv_rank_metriche as
select
  p.id as user_id,
  (select count(*) from public.lesson_progress lp
    where lp.user_id = p.id)::integer                             as lezioni_completate_totale,
  (select count(*) from public.lesson_progress lp
    where lp.user_id = p.id
      and lp.completed_at >= date_trunc('month', now()))::integer as lezioni_completate_mensile,
  (select count(*) from public.clients c
    where c.owner_id = p.id)::integer                             as clienti_acquisiti_totale,
  (select count(*) from public.clients c
    where c.owner_id = p.id
      and c.created_at >= date_trunc('month', now()))::integer    as clienti_acquisiti_mensile,
  (select count(distinct r.client_id) from public.renewals r
    where r.owner_id = p.id and r.status = 'attivo'
      and r.current_due_date >= current_date and r.client_id is not null)::integer as clienti_attivi_totale,
  (select count(*) from public.renewals r
    where r.owner_id = p.id and r.status = 'attivo'
      and r.current_due_date >= current_date)::integer            as rinnovi_attivi_totale
from public.profiles p;

create unique index if not exists mv_rank_metriche_user_idx on public.mv_rank_metriche (user_id);
revoke all on public.mv_rank_metriche from authenticated, anon, public;
select public.refresh_rank();
