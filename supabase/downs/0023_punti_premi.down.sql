-- ============================================================================
-- Annulla la migrazione 0023 (punti premio e catalogo).
--
-- ⚠️ Cancella il REGISTRO dei punti, i saldi e i riscatti. È la storia di cosa
-- ciascuno ha guadagnato e speso, e non è ricostruibile: `points_accrual` è
-- l'unica cosa che sa quanto è già stato pagato, e sparisce con le altre.
-- Esporta prima, se serve:
--
--   copy (select * from public.points_ledger) to stdout with csv header;
--   copy (select * from public.reward_redemptions) to stdout with csv header;
-- ============================================================================

drop trigger if exists points_applica_al_saldo_trg on public.points_ledger;

drop function if exists public.assegna_bonus(uuid, numeric, text);
drop function if exists public.decidi_riscatto(uuid, text, text);
drop function if exists public.riscatta_premio(uuid);
drop function if exists public.matura_punti(uuid);
drop function if exists public.points_applica_al_saldo();

drop table if exists public.reward_redemptions;
drop table if exists public.reward_catalog;
drop table if exists public.points_accrual;
drop table if exists public.points_rules;
drop table if exists public.points_balance;
drop table if exists public.points_ledger;
