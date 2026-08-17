-- ============================================================================
-- Annulla la migrazione 0028 (non si resta senza amministratori).
--
-- ⚠️ Dopo questo, l'ultimo amministratore può togliersi il ruolo o essere
-- eliminato, e l'app resta senza nessuno che possa assegnare ruoli, gestire
-- la base di conoscenza o approvare i riscatti. Si rimedia solo dalla
-- dashboard di Supabase con la chiave service_role.
--
-- Prima di lanciarlo, verifica quanti amministratori ci sono:
--
--   select count(*) from public.profiles where role = 'admin';
-- ============================================================================

drop trigger if exists zz_vieta_cancella_ultimo_admin on public.profiles;
drop trigger if exists zz_vieta_ultimo_admin on public.profiles;

drop function if exists public.vieta_cancella_ultimo_admin();
drop function if exists public.vieta_ultimo_admin();
drop function if exists public.altri_admin(uuid);
