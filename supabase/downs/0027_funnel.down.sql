-- ============================================================================
-- Annulla la migrazione 0027 (funnel di acquisizione).
--
-- ⚠️ Cancella i funnel e la PROVA dei consensi raccolti. I contatti creati
-- restano in `clients` con `origine = 'funnel'`, e i loro consensi restano in
-- `contact_consents` — ma la riga che dimostra *cosa* quella persona ha letto
-- e quando sparisce. Per una contestazione GDPR è esattamente il documento che
-- serve. Esporta prima:
--
--   copy (select * from public.funnel_leads) to stdout with csv header;
-- ============================================================================

drop function if exists public.registra_lead(text, text, text, text, text[], text);
drop function if exists public.funnel_pubblico(text);

drop table if exists public.funnel_leads;
drop table if exists public.funnels;
