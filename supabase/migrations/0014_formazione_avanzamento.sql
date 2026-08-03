-- ============================================================================
-- Invisionary — Migrazione 0014: avanzamento formazione calcolato dal database.
-- Prerequisito: 0004_formazione.sql.
-- Idempotente.
--
-- COSA CAMBIA
--   · `lessons.duration_min`: durata indicativa, utile a stimare l'impegno.
--   · `lesson_progress.completed_manually`: distingue il completamento dichiarato
--     col pulsante da un futuro tracciamento automatico della visione.
--   · Due viste calcolano le percentuali una volta sola, invece di rifare i
--     conti in ogni schermata.
--
-- ⚠️ security_invoker = on È OBBLIGATORIO.
-- Una vista, per impostazione predefinita, gira coi permessi di CHI L'HA CREATA
-- e scavalca la RLS delle tabelle sottostanti: senza questa opzione chiunque
-- vedrebbe l'avanzamento di TUTTI. Con security_invoker la vista eredita i
-- permessi di chi la interroga, quindi il perimetro resta quello delle policy:
-- il collaboratore vede sé, il leader anche i propri collaboratori, l'admin
-- tutti. Richiede PostgreSQL 15+ (Supabase lo è).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Colonne nuove
-- ----------------------------------------------------------------------------
alter table public.lessons
  add column if not exists duration_min integer check (duration_min is null or duration_min > 0);

comment on column public.lessons.duration_min is
  'Durata indicativa in minuti. Nullable: non tutte le lezioni la dichiarano.';

alter table public.lesson_progress
  add column if not exists completed_manually boolean not null default true;

comment on column public.lesson_progress.completed_manually is
  'true = dichiarato dall''utente col pulsante. Distingue dal tracciamento automatico della visione, se un giorno arriverà.';

-- ----------------------------------------------------------------------------
-- 2. Avanzamento per corso.
--    Una riga per (persona visibile × corso), anche a zero lezioni completate:
--    un corso mai iniziato deve comunque comparire con 0%.
-- ----------------------------------------------------------------------------
drop view if exists public.v_avanzamento_corso;
create view public.v_avanzamento_corso
with (security_invoker = on)
as
select
  p.id                                            as user_id,
  c.id                                            as course_id,
  count(distinct lp.lesson_id)::integer           as completate,
  count(distinct l.id)::integer                   as totale,
  case
    when count(distinct l.id) = 0 then 0
    else round(count(distinct lp.lesson_id) * 100.0 / count(distinct l.id))::integer
  end                                             as percentuale
from public.profiles p
cross join public.courses c
left join public.lessons l
  on l.course_id = c.id
left join public.lesson_progress lp
  on lp.lesson_id = l.id and lp.user_id = p.id
group by p.id, c.id;

comment on view public.v_avanzamento_corso is
  'Percentuale di completamento per persona e corso. security_invoker: il perimetro lo decide la RLS.';

-- ----------------------------------------------------------------------------
-- 3. Avanzamento complessivo, su tutte le lezioni esistenti.
-- ----------------------------------------------------------------------------
drop view if exists public.v_avanzamento_globale;
create view public.v_avanzamento_globale
with (security_invoker = on)
as
select
  p.id                                     as user_id,
  count(lp.lesson_id)::integer             as completate,
  (select count(*) from public.lessons)::integer as totale,
  case
    when (select count(*) from public.lessons) = 0 then 0
    else round(count(lp.lesson_id) * 100.0 / (select count(*) from public.lessons))::integer
  end                                      as percentuale
from public.profiles p
left join public.lesson_progress lp on lp.user_id = p.id
group by p.id;

comment on view public.v_avanzamento_globale is
  'Percentuale complessiva per persona. security_invoker: il perimetro lo decide la RLS.';

grant select on public.v_avanzamento_corso to authenticated;
grant select on public.v_avanzamento_globale to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Nessuno segna una lezione per conto di un altro.
--    La policy di INSERT lo impedisce già (user_id = auth.uid()), ma il valore
--    predefinito della colonna potrebbe essere aggirato passando un user_id
--    esplicito: il trigger lo riporta sempre a chi sta scrivendo.
-- ----------------------------------------------------------------------------
create or replace function public.lesson_progress_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists lesson_progress_guard_trigger on public.lesson_progress;
create trigger lesson_progress_guard_trigger
  before insert on public.lesson_progress
  for each row execute function public.lesson_progress_guard();
