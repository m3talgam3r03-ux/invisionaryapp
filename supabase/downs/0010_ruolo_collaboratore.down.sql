-- ============================================================================
-- DOWN della migrazione 0010: riporta il ruolo da `collaboratore` a `collaborator`.
--
-- ⚠️ Questa cartella NON viene applicata da `supabase db push`: i down si
-- eseguono a mano dal SQL Editor quando serve tornare indietro.
--
-- Da eseguire insieme al ripristino della versione precedente dell'app.
-- Idempotente.
-- ============================================================================

-- 1. Via il vincolo, altrimenti l'update non passa.
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

-- 2. Righe indietro.
update public.profiles
set role = 'collaborator'
where role = 'collaboratore';

-- 3. Default indietro.
alter table public.profiles alter column role set default 'collaborator';

-- 4. Vincolo con i valori di prima.
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'leader', 'collaborator'));

-- 5. Trigger di registrazione come in 0001.
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
    'collaborator'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
