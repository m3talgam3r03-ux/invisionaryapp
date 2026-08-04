-- ============================================================================
-- Invisionary — Migrazione 0017: CRM con stati, storico e filtri.
-- Prerequisito: 0002_clients.sql, 0015 (matview del rank).
-- Idempotente.
--
-- Primo pezzo di M6. Consensi (M6b), import/export (M6c) e invii (M6d) seguono.
--
-- Lo storico degli stati non è un di più: serve a capire DOVE si perde la rete.
-- Sapere che un contatto è «perso» non dice nulla; sapere che è passato da
-- appuntamento a perso, e quando, sì.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Stato del contatto.
--    CHECK e non enum, coerentemente con la scelta fatta per i ruoli: vincola
--    allo stesso insieme di valori senza migrazioni di tipo.
-- ----------------------------------------------------------------------------
alter table public.clients
  add column if not exists stato text not null default 'nuovo',
  add column if not exists origine text not null default 'manuale',
  add column if not exists tags text[] not null default '{}',
  add column if not exists ultimo_contatto_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clients'::regclass and conname = 'clients_stato_check'
  ) then
    alter table public.clients add constraint clients_stato_check
      check (stato in ('nuovo', 'contattato', 'appuntamento', 'cliente', 'perso'));
  end if;
end $$;

comment on column public.clients.stato is
  'Fase della trattativa: nuovo → contattato → appuntamento → cliente | perso.';
comment on column public.clients.origine is
  'Da dove arriva: manuale, import, oppure funnel:<slug>. Serve per capire cosa funziona.';
comment on column public.clients.ultimo_contatto_at is
  'Ultimo contatto reale. Si aggiorna da sola a ogni cambio di stato.';

create index if not exists clients_stato_idx on public.clients (owner_id, stato);
create index if not exists clients_ultimo_contatto_idx on public.clients (owner_id, ultimo_contatto_at desc nulls last);
create index if not exists clients_tags_idx on public.clients using gin (tags);

-- ----------------------------------------------------------------------------
-- 2. Storico dei passaggi di stato: append-only, scritto dai trigger.
-- ----------------------------------------------------------------------------
create table if not exists public.contact_status_history (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  da_stato    text,
  a_stato     text not null,
  actor_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists contact_status_history_client_idx
  on public.contact_status_history (client_id, created_at desc);

comment on table public.contact_status_history is
  'Passaggi di stato di un contatto. Append-only: nessuno lo modifica o cancella a mano.';

alter table public.contact_status_history enable row level security;

drop policy if exists contact_status_history_select on public.contact_status_history;
create policy contact_status_history_select on public.contact_status_history
  for select using (
    exists (
      select 1 from public.clients c
      where c.id = contact_status_history.client_id
        and public.can_read_member(c.owner_id)
    )
  );

grant select on public.contact_status_history to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Lo storico si scrive da solo, e la data di ultimo contatto pure.
-- ----------------------------------------------------------------------------
create or replace function public.clients_log_stato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.contact_status_history (client_id, da_stato, a_stato, actor_id)
    values (new.id, null, new.stato, auth.uid());
    return new;
  end if;

  if new.stato is distinct from old.stato then
    insert into public.contact_status_history (client_id, da_stato, a_stato, actor_id)
    values (new.id, old.stato, new.stato, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists clients_log_stato_insert on public.clients;
create trigger clients_log_stato_insert
  after insert on public.clients
  for each row execute function public.clients_log_stato();

drop trigger if exists clients_log_stato_update on public.clients;
create trigger clients_log_stato_update
  after update on public.clients
  for each row execute function public.clients_log_stato();

-- Cambiare stato È un contatto: la data si aggiorna senza doverci pensare.
create or replace function public.clients_touch_contatto()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.ultimo_contatto_at := coalesce(new.ultimo_contatto_at, now());
  elsif new.stato is distinct from old.stato and new.ultimo_contatto_at is not distinct from old.ultimo_contatto_at then
    new.ultimo_contatto_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists clients_touch_contatto_trigger on public.clients;
create trigger clients_touch_contatto_trigger
  before insert or update on public.clients
  for each row execute function public.clients_touch_contatto();

-- ----------------------------------------------------------------------------
-- 4. La metrica del rank si affina.
--    In 0015 «clienti acquisiti» era «clienti creati nel periodo», perché lo
--    stato non esisteva ancora. Ora esiste: conta chi è diventato cliente
--    davvero. Anche «clienti attivi» smette di dipendere solo dai rinnovi.
-- ----------------------------------------------------------------------------
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
    where c.owner_id = p.id and c.stato = 'cliente')::integer     as clienti_acquisiti_totale,

  (select count(*) from public.clients c
    where c.owner_id = p.id
      and c.stato = 'cliente'
      and c.created_at >= date_trunc('month', now()))::integer    as clienti_acquisiti_mensile,

  (select count(distinct r.client_id) from public.renewals r
    where r.owner_id = p.id
      and r.status = 'attivo'
      and r.current_due_date >= current_date
      and r.client_id is not null)::integer                       as clienti_attivi_totale,

  (select count(*) from public.renewals r
    where r.owner_id = p.id
      and r.status = 'attivo'
      and r.current_due_date >= current_date)::integer            as rinnovi_attivi_totale
from public.profiles p;

create unique index if not exists mv_rank_metriche_user_idx
  on public.mv_rank_metriche (user_id);

-- Come in 0015: la matview non ha RLS, quindi non esce mai direttamente.
revoke all on public.mv_rank_metriche from authenticated, anon, public;

select public.refresh_rank();
