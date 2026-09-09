-- ============================================================================
-- Annulla la migrazione 0029 (rimozione del funnel).
--
-- Non ricostruisce niente da sé: per riavere il funnel si rilancia la 0027,
-- che è rimasta nel repository proprio per questo.
--
--   psql "$DATABASE_URL" -f supabase/migrations/0027_funnel.sql
--
-- I contatti raccolti prima della 0029 NON tornano: quelli erano righe, e le
-- righe cancellate non si ricreano da uno schema.
-- ============================================================================

\echo 'Per riavere il funnel, rilancia supabase/migrations/0027_funnel.sql'
