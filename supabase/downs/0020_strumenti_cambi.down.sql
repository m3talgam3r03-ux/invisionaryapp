-- ============================================================================
-- DOWN della migrazione 0020.
--
-- ⚠️ Si perdono gli strumenti configurati (comprese eventuali correzioni alle
-- dimensioni dei contratti fatte dall'admin) e la cache dei cambi. Quest'ultima
-- si ricostruisce da sola alla prima chiamata al fornitore; gli strumenti no,
-- quindi esportali se erano stati personalizzati:
--
--   copy (select * from public.instruments) to stdout with csv header;
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

drop function if exists public.cambio(text, text);

drop policy if exists fx_rates_select on public.fx_rates;
drop table if exists public.fx_rates;

drop policy if exists instruments_select on public.instruments;
drop policy if exists instruments_write on public.instruments;
drop index if exists public.instruments_tipo_idx;
drop table if exists public.instruments;
