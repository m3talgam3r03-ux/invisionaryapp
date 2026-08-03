-- ============================================================================
-- DOWN della migrazione 0014: torna a calcolare le percentuali nell'app.
--
-- Perdita di dati limitata: si perdono `duration_min` delle lezioni e il flag
-- `completed_manually`. I completamenti restano tutti.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

drop view if exists public.v_avanzamento_corso;
drop view if exists public.v_avanzamento_globale;

drop trigger if exists lesson_progress_guard_trigger on public.lesson_progress;
drop function if exists public.lesson_progress_guard();

alter table public.lesson_progress drop column if exists completed_manually;
alter table public.lessons drop column if exists duration_min;
