-- ============================================================================
-- Annulla la migrazione 0025 (mappa degli iscritti).
--
-- ⚠️ Cancella la regione dichiarata da ciascun iscritto. È un dato che hanno
-- inserito loro e che non si ricostruisce: esportalo prima se pensi di
-- riapplicare la migrazione.
--
--   copy (select id, regione from public.profiles where regione is not null)
--     to stdout with csv header;
-- ============================================================================

drop function if exists public.riepilogo_mappa(integer);
drop function if exists public.mappa_iscritti(integer);

drop index if exists public.profiles_regione_idx;
alter table public.profiles drop constraint if exists profiles_regione_valida;
alter table public.profiles drop column if exists regione;
