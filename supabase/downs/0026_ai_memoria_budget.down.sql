-- ============================================================================
-- Annulla la migrazione 0026 (memoria dell'agente e tetto di spesa).
--
-- ⚠️ TOGLIE IL TETTO DI SPESA. Dopo questo `ai-chat` torna a chiamare Claude
-- senza alcun limite per utente: è la condizione in cui una persona che tiene
-- premuto invio fa crescere il conto finché non arriva la fattura. Riapplica
-- la 0026 o metti un limite altrove prima di lasciare la function in piedi.
--
-- ⚠️ Cancella la memoria dell'agente. Sono appunti su persone: non si
-- ricostruiscono, e non è il caso di esportarli «per sicurezza» — se si tolgono
-- è perché non devono esserci più.
-- ============================================================================

drop trigger if exists ai_memory_pota_trg on public.ai_memory;
drop function if exists public.ai_memory_pota();
drop table if exists public.ai_memory;

drop function if exists public.budget_ai();
drop function if exists public.registra_token_ai(uuid, bigint, bigint);
drop function if exists public.consuma_richiesta_ai(uuid);
drop table if exists public.ai_usage;
drop table if exists public.ai_budget;
