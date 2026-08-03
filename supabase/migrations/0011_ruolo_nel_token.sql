-- ============================================================================
-- Invisionary — Migrazione 0011: il ruolo viaggia dentro il token (claim JWT).
-- Prerequisito: 0001_init.sql, 0010_ruolo_collaboratore.sql.
-- Idempotente.
--
-- PERCHÉ: oggi ogni valutazione di policy chiama is_admin(), che interroga
-- `profiles`. Con il ruolo nel token la lettura diventa gratuita.
--
-- ⚠️ DUE PASSAGGI: questa migrazione crea l'hook, ma l'hook va poi ATTIVATO a
-- mano su Supabase (Authentication → Hooks → Custom Access Token). Finché non
-- lo attivi, i token non hanno il claim.
-- Per questo is_admin() usa il claim SOLO se c'è e altrimenti ripiega sulla
-- tabella: la migrazione è sicura da applicare anche prima di attivare l'hook,
-- e le sessioni già emesse continuano a funzionare invece di trovarsi
-- improvvisamente senza permessi.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. L'hook: aggiunge `app_metadata.role` ai claim di ogni token emesso.
-- ----------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims    jsonb;
  ruolo     text;
begin
  select role into ruolo
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if ruolo is not null then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(ruolo));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Custom Access Token Hook: replica profiles.role in app_metadata.role del JWT. Va attivato da Authentication → Hooks.';

-- ----------------------------------------------------------------------------
-- 2. Permessi: solo il servizio di autenticazione può eseguire l'hook e leggere
--    i profili per costruirlo. Nessun altro.
-- ----------------------------------------------------------------------------
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;

drop policy if exists profiles_select_auth_admin on public.profiles;
create policy profiles_select_auth_admin on public.profiles
  as permissive for select
  to supabase_auth_admin
  using (true);

-- ----------------------------------------------------------------------------
-- 3. Il ruolo scritto nel token, quando disponibile.
--    Se il claim manca (hook non ancora attivo, oppure sessione emessa prima)
--    l'espressione vale NULL e si ripiega sulla tabella.
-- ----------------------------------------------------------------------------
create or replace function public.jwt_role()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

comment on function public.jwt_role() is
  'Ruolo letto dal claim del token; NULL se il claim non c''è (si ripiega su profiles).';

-- ----------------------------------------------------------------------------
-- 4. is_admin(): prima il token, poi la tabella.
--    Nota su coalesce: se il claim c'è e dice 'leader', il primo termine vale
--    FALSE (non NULL) e vince — giustamente. Solo un claim assente dà NULL e
--    lascia passare al ripiego.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.jwt_role() = 'admin',
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 5. can_read_member(): l'essere admin si risolve col token, ma il legame
--    leader → collaboratore resta una lettura di tabella (una relazione non
--    sta in un claim).
-- ----------------------------------------------------------------------------
create or replace function public.can_read_member(member uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    member = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = member and leader_id = auth.uid()
    );
$$;
