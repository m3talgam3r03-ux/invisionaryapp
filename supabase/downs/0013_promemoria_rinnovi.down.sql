-- ============================================================================
-- DOWN della migrazione 0013: torna al singolo `reminder_sent_at`.
--
-- ⚠️ PERDITA DI DATI: si perde il dettaglio di quali promemoria sono stati
-- inviati. I rinnovi che ne avevano ricevuto almeno uno vengono marcati come
-- "già avvisati", che è il comportamento più prudente: meglio un avviso in meno
-- che tre avvisi ripetuti agli utenti.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

-- 1. Rimette la colonna di prima.
alter table public.renewals
  add column if not exists reminder_sent_at timestamptz;

-- 2. Chi aveva già ricevuto un promemoria resta marcato come avvisato.
update public.renewals r
set reminder_sent_at = sub.ultimo
from (
  select renewal_id, max(sent_at) as ultimo
  from public.renewal_reminders
  group by renewal_id
) sub
where sub.renewal_id = r.id;

-- 3. Via funzioni, trigger e tabella.
drop function if exists public.rinnovi_da_avvisare();
drop function if exists public.riepilogo_rinnovi_leader();

drop trigger if exists renewals_reset_reminders_trigger on public.renewals;
drop function if exists public.renewals_reset_reminders();

drop policy if exists renewal_reminders_select on public.renewal_reminders;
drop table if exists public.renewal_reminders;
