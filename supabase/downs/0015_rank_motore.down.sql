-- ============================================================================
-- DOWN della migrazione 0015: il rank torna a essere calcolato nell'app.
--
-- ⚠️ Si perdono le regole e i livelli personalizzati: dopo il down valgono di
-- nuovo i pesi cablati in src/lib/rank.ts. Se erano stati modificati dal
-- pannello admin, annotali prima.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

drop function if exists public.classifica();
drop function if exists public.punti_utente(uuid);
drop function if exists public.refresh_rank();

drop materialized view if exists public.mv_rank_metriche;

drop policy if exists rank_rules_select on public.rank_rules;
drop policy if exists rank_rules_write on public.rank_rules;
drop policy if exists rank_tiers_select on public.rank_tiers;
drop policy if exists rank_tiers_write on public.rank_tiers;

drop table if exists public.rank_rules;
drop table if exists public.rank_tiers;
