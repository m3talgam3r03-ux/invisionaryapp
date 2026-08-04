-- ============================================================================
-- DOWN della migrazione 0016.
--
-- ⚠️ Si perdono i podi congelati e le soglie configurate. I `position_id` già
-- importati restano finché non si toglie la colonna: è l'ultima cosa che si
-- perde, perché reimportarli richiede una nuova sincronizzazione da MetaApi.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

drop function if exists public.congela_podio(date);
drop function if exists public.classifica_trader(date, date);

drop policy if exists leaderboard_snapshots_select on public.leaderboard_snapshots;
drop table if exists public.leaderboard_snapshots;

drop view if exists public.v_operazioni;

drop policy if exists trading_config_select on public.trading_config;
drop policy if exists trading_config_write on public.trading_config;
drop table if exists public.trading_config;

-- Il guardiano dei profili torna a proteggere solo role e leader_id.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.leader_id := old.leader_id;
  end if;
  return new;
end;
$$;

alter table public.profiles drop column if exists vip_call_host;

drop index if exists public.trades_position_idx;
alter table public.trades drop column if exists position_id;
