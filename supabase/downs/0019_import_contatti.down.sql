-- ============================================================================
-- DOWN della migrazione 0019.
--
-- ⚠️ Si perdono le dichiarazioni di origine e base giuridica delle
-- importazioni: è la risposta a «perché avete questi dati». Esportale prima:
--
--   copy (select * from public.import_batches) to stdout with csv header;
--
-- Email e telefono normalizzati si perdono, ma non è un danno: restano nel
-- campo libero `contatto`, da cui erano stati ricavati.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

drop function if exists public.export_contatti();
drop function if exists public.trova_duplicati(text[], text[]);

drop trigger if exists clients_normalizza_trigger on public.clients;
drop function if exists public.clients_normalizza();
drop function if exists public.normalizza_telefono(text, text);
drop function if exists public.normalizza_email(text);

drop index if exists public.clients_email_idx;
drop index if exists public.clients_telefono_idx;

alter table public.clients
  drop column if exists email,
  drop column if exists telefono_e164,
  drop column if exists import_batch_id;

drop policy if exists import_batches_select on public.import_batches;
drop policy if exists import_batches_insert on public.import_batches;
drop table if exists public.import_batches;
