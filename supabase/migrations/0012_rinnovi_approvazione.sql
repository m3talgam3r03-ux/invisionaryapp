-- ============================================================================
-- Invisionary — Migrazione 0012: rinnovi con approvazione e storico.
-- Prerequisito: 0003_renewals.sql, 0010, 0011.
-- Idempotente.
--
-- COSA CAMBIA
--   · `scadenza` diventa `current_due_date` e nasce `interval_days` (durata del
--     rinnovo), distinto dai giorni di preavviso.
--   · Gli stati passano all'italiano e si aggiunge `in_attesa_approvazione`.
--   · Il collaboratore propone, leader o admin approvano: la regola è imposta da
--     un trigger, non dall'interfaccia.
--   · Ogni transizione finisce in `renewal_history`.
--
-- NOTA SUL leader_id: non viene copiato dentro `renewals`. Se un collaboratore
-- cambia leader, una copia resterebbe indietro e l'approvazione spetterebbe alla
-- persona sbagliata. L'approvatore si ricava da profiles.leader_id, che resta
-- l'unica verità sulla gerarchia.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colonne
-- ----------------------------------------------------------------------------
alter table public.renewals rename column scadenza to current_due_date;

alter table public.renewals
  add column if not exists interval_days integer not null default 30,
  add column if not exists requested_at  timestamptz,
  add column if not exists requested_by  uuid references public.profiles (id) on delete set null,
  add column if not exists approved_at   timestamptz,
  add column if not exists approved_by   uuid references public.profiles (id) on delete set null,
  add column if not exists note          text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.renewals'::regclass and conname = 'renewals_interval_days_check'
  ) then
    alter table public.renewals
      add constraint renewals_interval_days_check check (interval_days > 0);
  end if;
end $$;

-- I giorni di preavviso non servono più: gli avvisi partono a -7/-3/-1 fissi.
alter table public.renewals drop column if exists alert_days_before;

-- ----------------------------------------------------------------------------
-- 2. Stati in italiano
-- ----------------------------------------------------------------------------
do $$
declare
  vincolo text;
begin
  select conname into vincolo
  from pg_constraint
  where conrelid = 'public.renewals'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';
  if vincolo is not null then
    execute format('alter table public.renewals drop constraint %I', vincolo);
  end if;
end $$;

alter table public.renewals alter column status drop default;

update public.renewals set status = case status
  when 'active'  then 'attivo'
  when 'renewed' then 'attivo'   -- rinnovato = torna attivo con la nuova scadenza
  when 'lost'    then 'annullato'
  else status
end
where status in ('active', 'renewed', 'lost');

alter table public.renewals alter column status set default 'attivo';

alter table public.renewals
  add constraint renewals_status_check
  check (status in ('attivo', 'in_attesa_approvazione', 'scaduto', 'annullato'));

comment on column public.renewals.current_due_date is
  'Scadenza corrente. Il rinnovo somma interval_days a QUESTA data, non a oggi.';
comment on column public.renewals.interval_days is
  'Durata del rinnovo in giorni (default 30), configurabile per contratto.';

-- ----------------------------------------------------------------------------
-- 3. Storico: append-only, una riga per transizione.
-- ----------------------------------------------------------------------------
create table if not exists public.renewal_history (
  id            uuid primary key default gen_random_uuid(),
  renewal_id    uuid not null references public.renewals (id) on delete cascade,
  action        text not null check (action in
                  ('creato', 'rinnovo_richiesto', 'approvato', 'rifiutato', 'data_modificata', 'annullato')),
  old_due_date  date,
  new_due_date  date,
  actor_id      uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists renewal_history_renewal_idx
  on public.renewal_history (renewal_id, created_at desc);

comment on table public.renewal_history is
  'Storico append-only dei rinnovi: chi ha fatto cosa e quando. Non si modifica né si cancella.';

-- ----------------------------------------------------------------------------
-- 4. Chi può approvare
-- ----------------------------------------------------------------------------
create or replace function public.is_leader_of(member uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = member and leader_id = auth.uid()
  );
$$;

comment on function public.is_leader_of(uuid) is
  'Vero se chi chiama è il leader diretto di `member`. Legge profiles: la gerarchia non sta nel token.';

-- Approva un rinnovo: l'admin sempre (è l'autorità finale e non ha nessuno
-- sopra di sé: negargli l'auto-approvazione bloccherebbe i suoi rinnovi per
-- sempre); tutti gli altri solo rinnovi ALTRUI e solo dei propri collaboratori.
create or replace function public.can_approve_renewal(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or (owner <> auth.uid() and public.is_leader_of(owner));
$$;

-- ----------------------------------------------------------------------------
-- 5. Il guardiano: impone chi può fare cosa, a prescindere dall'interfaccia.
--    Contesti privilegiati (service_role, SQL Editor) hanno auth.uid() nullo e
--    passano: servono per seed e manutenzione.
-- ----------------------------------------------------------------------------
create or replace function public.renewals_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approvatore boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  approvatore := public.can_approve_renewal(old.owner_id);

  if not approvatore then
    -- Chi non approva non tocca i campi dell'approvazione.
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;

    -- Toccare la scadenza o lo stato è una RICHIESTA, non una decisione.
    if new.current_due_date is distinct from old.current_due_date
       or new.status is distinct from old.status then
      new.status       := 'in_attesa_approvazione';
      new.requested_at := now();
      new.requested_by := auth.uid();
    end if;
  else
    -- L'approvatore che rimette il rinnovo in 'attivo' sta approvando: lo
    -- registriamo noi, così la data non dipende da cosa manda il client.
    if new.status = 'attivo' and old.status = 'in_attesa_approvazione' then
      new.approved_at := now();
      new.approved_by := auth.uid();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists renewals_guard_trigger on public.renewals;
create trigger renewals_guard_trigger
  before update on public.renewals
  for each row execute function public.renewals_guard();

-- ----------------------------------------------------------------------------
-- 6. Lo storico si scrive da solo.
-- ----------------------------------------------------------------------------
create or replace function public.renewals_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  azione text;
begin
  if tg_op = 'INSERT' then
    insert into public.renewal_history (renewal_id, action, new_due_date, actor_id)
    values (new.id, 'creato', new.current_due_date, auth.uid());
    return new;
  end if;

  -- UPDATE: registra solo ciò che è davvero cambiato.
  if new.status = 'in_attesa_approvazione' and old.status is distinct from new.status then
    azione := 'rinnovo_richiesto';
  elsif new.status = 'attivo' and old.status = 'in_attesa_approvazione' then
    azione := 'approvato';
  elsif new.status = 'annullato' and old.status is distinct from new.status then
    azione := 'annullato';
  elsif new.current_due_date is distinct from old.current_due_date then
    azione := 'data_modificata';
  else
    return new;
  end if;

  insert into public.renewal_history (renewal_id, action, old_due_date, new_due_date, actor_id)
  values (new.id, azione, old.current_due_date, new.current_due_date, auth.uid());
  return new;
end;
$$;

drop trigger if exists renewals_log_insert on public.renewals;
create trigger renewals_log_insert
  after insert on public.renewals
  for each row execute function public.renewals_log();

drop trigger if exists renewals_log_update on public.renewals;
create trigger renewals_log_update
  after update on public.renewals
  for each row execute function public.renewals_log();

-- ----------------------------------------------------------------------------
-- 7. Calcolo della prossima scadenza: somma sulla scadenza precedente, non su
--    oggi. Approvare in ritardo non deve far perdere giorni.
-- ----------------------------------------------------------------------------
create or replace function public.next_due_date(current_due date, interval_days integer)
returns date
language sql
immutable
as $$
  select current_due + make_interval(days => interval_days);
$$;

-- ----------------------------------------------------------------------------
-- 8. RLS
--    renewals        → lettura owner/leader/admin (invariata);
--                      UPDATE aperta anche all'approvatore, con il guardiano a
--                      decidere cosa può davvero cambiare.
--    renewal_history → sola lettura, con lo stesso perimetro del rinnovo.
--                      Nessuno scrive a mano: scrivono i trigger.
-- ----------------------------------------------------------------------------
drop policy if exists renewals_update on public.renewals;
create policy renewals_update on public.renewals
  for update
  using (owner_id = auth.uid() or public.can_approve_renewal(owner_id))
  with check (owner_id = auth.uid() or public.can_approve_renewal(owner_id));

alter table public.renewal_history enable row level security;

drop policy if exists renewal_history_select on public.renewal_history;
create policy renewal_history_select on public.renewal_history
  for select using (
    exists (
      select 1 from public.renewals r
      where r.id = renewal_history.renewal_id
        and public.can_read_member(r.owner_id)
    )
  );

grant select on public.renewal_history to authenticated;
