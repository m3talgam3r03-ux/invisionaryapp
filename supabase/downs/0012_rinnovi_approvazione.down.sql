-- ============================================================================
-- DOWN della migrazione 0012: riporta i rinnovi allo schema di 0003.
--
-- ⚠️ PERDITA DI DATI: si perdono lo storico (`renewal_history`), le colonne di
-- approvazione e `interval_days`. Gli stati tornano ai tre di prima, quindi
-- `in_attesa_approvazione` viene ricondotto ad `active`.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

-- 1. Via trigger e guardiano.
drop trigger if exists renewals_guard_trigger on public.renewals;
drop trigger if exists renewals_log_insert on public.renewals;
drop trigger if exists renewals_log_update on public.renewals;
drop function if exists public.renewals_guard();
drop function if exists public.renewals_log();
drop function if exists public.next_due_date(date, integer);
drop function if exists public.can_approve_renewal(uuid);
drop function if exists public.is_leader_of(uuid);

-- 2. Via lo storico.
drop policy if exists renewal_history_select on public.renewal_history;
drop table if exists public.renewal_history;

-- 3. Stati come in 0003.
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
  when 'attivo'                 then 'active'
  when 'in_attesa_approvazione' then 'active'
  when 'scaduto'                then 'active'
  when 'annullato'              then 'lost'
  else status
end
where status in ('attivo', 'in_attesa_approvazione', 'scaduto', 'annullato');

alter table public.renewals alter column status set default 'active';
alter table public.renewals
  add constraint renewals_status_check check (status in ('active', 'renewed', 'lost'));

-- 4. Colonne come in 0003.
alter table public.renewals
  drop column if exists interval_days,
  drop column if exists requested_at,
  drop column if exists requested_by,
  drop column if exists approved_at,
  drop column if exists approved_by,
  drop column if exists note;

alter table public.renewals
  add column if not exists alert_days_before integer not null default 30;

alter table public.renewals rename column current_due_date to scadenza;

-- 5. Policy di UPDATE come in 0003 (solo il proprietario o l'admin).
drop policy if exists renewals_update on public.renewals;
create policy renewals_update on public.renewals
  for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
