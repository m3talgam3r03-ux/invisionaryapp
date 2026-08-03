-- ============================================================================
-- Invisionary — Migrazione 0013: promemoria dei rinnovi a -7 / -3 / -1 giorni.
-- Prerequisito: 0012_rinnovi_approvazione.sql.
-- Idempotente.
--
-- PERCHÉ CAMBIA LO SCHEMA: `renewals.reminder_sent_at` era un solo timestamp e
-- non poteva esprimere tre invii distinti — una volta valorizzato, non partiva
-- più nulla. Serve tracciare QUALE promemoria è stato mandato.
--
-- Il vincolo di unicità su (renewal_id, offset_days) rende l'invio doppio
-- impossibile per costruzione: se il cron gira due volte, la seconda insert
-- viene semplicemente ignorata. Meglio di un controllo applicativo, che due
-- esecuzioni sovrapposte bucherebbero.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Che cosa è già stato mandato.
-- ----------------------------------------------------------------------------
create table if not exists public.renewal_reminders (
  renewal_id   uuid not null references public.renewals (id) on delete cascade,
  offset_days  integer not null check (offset_days > 0),
  sent_at      timestamptz not null default now(),
  primary key (renewal_id, offset_days)
);

comment on table public.renewal_reminders is
  'Promemoria già inviati per un rinnovo. La chiave primaria impedisce il doppio invio.';

-- ----------------------------------------------------------------------------
-- 2. RLS: la scrittura è solo della Edge Function (service_role, che scavalca
--    la RLS). Agli utenti autenticati resta la sola lettura, e solo sui rinnovi
--    che già possono vedere: nessuna policy di scrittura, di proposito.
-- ----------------------------------------------------------------------------
alter table public.renewal_reminders enable row level security;

drop policy if exists renewal_reminders_select on public.renewal_reminders;
create policy renewal_reminders_select on public.renewal_reminders
  for select using (
    exists (
      select 1 from public.renewals r
      where r.id = renewal_reminders.renewal_id
        and public.can_read_member(r.owner_id)
    )
  );

grant select on public.renewal_reminders to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Se la scadenza si sposta, il ciclo di avvisi ricomincia da capo.
-- ----------------------------------------------------------------------------
create or replace function public.renewals_reset_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.current_due_date is distinct from old.current_due_date then
    delete from public.renewal_reminders where renewal_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists renewals_reset_reminders_trigger on public.renewals;
create trigger renewals_reset_reminders_trigger
  after update on public.renewals
  for each row execute function public.renewals_reset_reminders();

-- La vecchia colonna non serve più: la sostituisce renewal_reminders.
alter table public.renewals drop column if exists reminder_sent_at;

-- ----------------------------------------------------------------------------
-- 4. Chi va avvisato adesso.
--    La selezione sta qui e non nella Edge Function: è la stessa regola per
--    tutti i chiamanti ed è verificabile con una query.
--
--    Nota sul recupero: se il cron salta dei giorni, arrivando a -1 risultano
--    dovuti anche -7 e -3. Non mandiamo tre notifiche uguali: si manda una sola
--    volta e si registrano tutti gli scaglioni coperti, così non riemergono
--    domani.
-- ----------------------------------------------------------------------------
create or replace function public.rinnovi_da_avvisare()
returns table (
  renewal_id       uuid,
  owner_id         uuid,
  prodotto         text,
  cliente          text,
  current_due_date date,
  giorni_mancanti  integer,
  offsets_coperti  integer[]
)
language sql
stable
security definer
set search_path = public
as $$
  with scaglioni as (
    select unnest(array[7, 3, 1]) as off
  ),
  dovuti as (
    select r.id, r.owner_id, r.prodotto, r.client_id, r.current_due_date, s.off
    from public.renewals r
    cross join scaglioni s
    where r.status = 'attivo'
      and r.current_due_date >= current_date               -- non già scaduto
      and r.current_due_date - s.off <= current_date       -- è arrivato il momento
      and not exists (
        select 1 from public.renewal_reminders rr
        where rr.renewal_id = r.id and rr.offset_days = s.off
      )
  )
  select
    d.id,
    d.owner_id,
    d.prodotto,
    c.nome,
    d.current_due_date,
    (d.current_due_date - current_date)::integer,
    array_agg(d.off order by d.off desc)
  from dovuti d
  left join public.clients c on c.id = d.client_id
  group by d.id, d.owner_id, d.prodotto, c.nome, d.current_due_date;
$$;

-- ----------------------------------------------------------------------------
-- 5. Riepilogo settimanale per i leader: quanto c'è da presidiare nella rete.
--    Solo conteggi, nessun nome: il riepilogo è un promemoria, non un report.
-- ----------------------------------------------------------------------------
create or replace function public.riepilogo_rinnovi_leader()
returns table (
  leader_id     uuid,
  in_scadenza   integer,
  da_approvare  integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.leader_id,
    count(*) filter (
      where r.status = 'attivo'
        and r.current_due_date between current_date and current_date + 7
    )::integer,
    count(*) filter (where r.status = 'in_attesa_approvazione')::integer
  from public.renewals r
  join public.profiles p on p.id = r.owner_id
  where p.leader_id is not null
  group by p.leader_id
  having count(*) filter (
           where r.status = 'attivo'
             and r.current_due_date between current_date and current_date + 7
         ) > 0
      or count(*) filter (where r.status = 'in_attesa_approvazione') > 0;
$$;

-- Le due funzioni le chiama la Edge Function con la service_role; nessun
-- utente autenticato deve poterle eseguire.
revoke execute on function public.rinnovi_da_avvisare() from authenticated, anon, public;
revoke execute on function public.riepilogo_rinnovi_leader() from authenticated, anon, public;
