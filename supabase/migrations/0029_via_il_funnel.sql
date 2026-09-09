-- ============================================================================
-- Invisionary — Migrazione 0029: via il funnel.
-- Prerequisito: 0027 (che lo aveva introdotto).
-- Idempotente.
--
-- ⚠️ COSA SPARISCE
-- Le pagine pubbliche di raccolta contatti e, con loro, `funnel_leads` — che
-- conteneva la PROVA del consenso: il testo esatto che ogni persona aveva
-- letto e accettato, con data e provenienza. Per una contestazione GDPR è
-- esattamente il documento che serve.
--
-- Si può fare senza perdere niente perché la tabella è VUOTA: verificato prima
-- di scrivere questa migrazione (`select id from funnel_leads` → nessuna riga).
-- Se un domani il funnel tornasse su un progetto dove ha raccolto contatti,
-- questa migrazione NON va lanciata prima di aver esportato:
--
--   copy (select * from public.funnel_leads) to stdout with csv header;
--
-- ── COSA RESTA, DI PROPOSITO ──
-- `clients.origine` continua ad accettare il valore 'funnel'. I contatti già
-- arrivati da un funnel restano marcati per quello che sono: cambiare il
-- vincolo riscriverebbe la loro storia per far tornare i conti a noi.
-- ============================================================================

-- Prima le funzioni: dipendono dalle tabelle.
drop function if exists public.registra_lead(text, text, text, text, text[], text);
drop function if exists public.funnel_pubblico(text);

-- Poi le tabelle. `funnel_leads` per prima: ha la chiave esterna verso `funnels`.
drop table if exists public.funnel_leads;
drop table if exists public.funnels;
