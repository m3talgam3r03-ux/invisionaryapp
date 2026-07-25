-- ============================================================================
-- Invisionary — Migrazione 0002: CRM `clients`.
-- Prerequisito: 0001_init.sql (usa is_admin() e can_read_member()).
-- Idempotente.
-- ============================================================================

create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nome        text not null,
  contatto    text,
  prodotto    text,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.clients is 'Anagrafica clienti CRM, di proprietà del collaboratore (owner_id).';

create index if not exists clients_owner_id_idx on public.clients (owner_id);

-- updated_at automatico
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: clients
--   SELECT → propri clienti | clienti dei propri collaboratori (leader) | admin
--   INSERT/UPDATE/DELETE → solo il proprietario | admin
-- ----------------------------------------------------------------------------
alter table public.clients enable row level security;

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select using (public.can_read_member(owner_id));

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete using (owner_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.clients to authenticated;
