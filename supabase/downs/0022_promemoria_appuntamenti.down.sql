-- ============================================================================
-- Annulla la migrazione 0022 (promemoria degli appuntamenti).
--
-- ⚠️ Cancella la traccia dei promemoria già inviati. Riapplicando la 0022, gli
-- appuntamenti ancora futuri riceveranno di nuovo l'avviso: fastidioso, non
-- dannoso.
-- ============================================================================

drop function if exists public.appuntamenti_da_avvisare();
drop table if exists public.booking_reminders;
