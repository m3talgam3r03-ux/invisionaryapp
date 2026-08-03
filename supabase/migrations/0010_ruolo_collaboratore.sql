-- ============================================================================
-- Invisionary — Migrazione 0010: il ruolo `collaborator` diventa `collaboratore`.
-- Prerequisito: 0001_init.sql.
-- Idempotente: rieseguibile senza errori.
--
-- Ordine obbligato: il vincolo CHECK va rimosso PRIMA di aggiornare le righe,
-- altrimenti l'update verrebbe rifiutato perché il nuovo valore non è ancora
-- ammesso.
--
-- ⚠️ Va applicata insieme al rilascio dell'app: una versione dell'app che
-- confronta ancora 'collaborator' non riconoscerebbe più i collaboratori.
-- Il `down` corrispondente è in supabase/downs/0010_ruolo_collaboratore.down.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rimuove il vincolo sul ruolo, qualunque nome abbia (in 0001 è stato creato
--    inline sulla colonna, quindi il nome lo ha scelto Postgres).
-- ----------------------------------------------------------------------------
do $$
declare
  vincolo text;
begin
  select conname into vincolo
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%';

  if vincolo is not null then
    execute format('alter table public.profiles drop constraint %I', vincolo);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Migra le righe esistenti. Alla seconda esecuzione non tocca nulla.
-- ----------------------------------------------------------------------------
update public.profiles
set role = 'collaboratore'
where role = 'collaborator';

-- ----------------------------------------------------------------------------
-- 3. Nuovo valore predefinito per chi si registra.
-- ----------------------------------------------------------------------------
alter table public.profiles alter column role set default 'collaboratore';

-- ----------------------------------------------------------------------------
-- 4. Rimette il vincolo, ora con i valori aggiornati.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'leader', 'collaboratore'));

-- ----------------------------------------------------------------------------
-- 5. Il trigger di registrazione deve creare il profilo col valore nuovo.
--    (Sostituisce la versione definita in 0001.)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'collaboratore'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on column public.profiles.role is
  'Ruolo: admin | leader | collaboratore. Le policy RLS usano is_admin() e can_read_member().';
