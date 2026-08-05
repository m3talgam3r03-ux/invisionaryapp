-- ============================================================================
-- DOWN della migrazione 0018.
--
-- ⚠️ ATTENZIONE, QUI PIÙ CHE ALTROVE: si perdono i consensi registrati e la
-- loro storia, cioè la prova di essere autorizzati a contattare qualcuno.
-- Senza, gli invii non sono più difendibili. Esportali prima:
--
--   copy (select * from public.contact_consents) to stdout with csv header;
--   copy (select * from public.consent_history)  to stdout with csv header;
--
-- Il registro delle cancellazioni si perde a sua volta: è la prova di aver
-- onorato le richieste di cancellazione.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

drop function if exists public.delete_contact_data(uuid, text);
drop function if exists public.export_contact_data(uuid);

drop view if exists public.contactable_by_email;
drop view if exists public.contactable_by_sms;
drop view if exists public.contactable_by_whatsapp;
drop view if exists public.contactable_by_telefono;

drop trigger if exists consents_log_trigger on public.contact_consents;
drop function if exists public.consents_log();

drop policy if exists contact_consents_select on public.contact_consents;
drop policy if exists contact_consents_write on public.contact_consents;
drop policy if exists consent_history_select on public.consent_history;
drop policy if exists deletion_log_select on public.deletion_log;

drop table if exists public.consent_history;
drop table if exists public.contact_consents;
drop table if exists public.deletion_log;
