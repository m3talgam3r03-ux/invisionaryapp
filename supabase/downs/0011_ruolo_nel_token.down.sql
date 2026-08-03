-- ============================================================================
-- DOWN della migrazione 0011: toglie il ruolo dal token e riporta le funzioni
-- a leggere solo dalla tabella.
--
-- ⚠️ Prima di eseguire questo down, DISATTIVA l'hook su Supabase
-- (Authentication → Hooks → Custom Access Token), altrimenti l'emissione dei
-- token fallisce perché la funzione non esiste più.
--
-- Questa cartella non viene applicata da `supabase db push`.
-- Idempotente.
-- ============================================================================

-- 1. is_admin() torna a leggere solo la tabella.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. can_read_member() come in 0001.
create or replace function public.can_read_member(member uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    member = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = member and leader_id = auth.uid()
    )
    or public.is_admin();
$$;

-- 3. Via l'hook e i suoi permessi.
drop policy if exists profiles_select_auth_admin on public.profiles;
revoke select on table public.profiles from supabase_auth_admin;
drop function if exists public.custom_access_token_hook(jsonb);
drop function if exists public.jwt_role();
