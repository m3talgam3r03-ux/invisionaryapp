-- ============================================================================
-- Invisionary — Migrazione 0001: profiles, ruoli, gerarchia e RLS.
-- Applicabile da: Supabase Studio → SQL Editor (incolla ed esegui) oppure
-- Supabase CLI (`supabase db push` / `supabase migration up`).
-- Idempotente: può essere rieseguita senza errori.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES: profilo utente collegato a auth.users, con ruolo e gerarchia.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'collaborator'
                check (role in ('admin', 'leader', 'collaborator')),
  leader_id   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Profilo utente Invisionary: ruolo (admin|leader|collaborator) e gerarchia a un livello (leader_id).';

create index if not exists profiles_leader_id_idx on public.profiles (leader_id);

-- ----------------------------------------------------------------------------
-- Helper SECURITY DEFINER — eseguiti come owner => bypassano la RLS ed evitano
-- la ricorsione infinita nelle policy che devono leggere profiles.
-- ----------------------------------------------------------------------------
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

-- True se l'utente corrente può LEGGERE i dati di `member`:
-- è se stesso, è un suo collaboratore (leader), oppure è admin.
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

-- ----------------------------------------------------------------------------
-- Trigger: crea automaticamente il profilo alla registrazione (ruolo default).
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
    'collaborator'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Trigger: impedisce a un utente NON admin di modificare role/leader_id
-- (anti privilege-escalation). Contesti privilegiati (service_role, SQL editor:
-- auth.uid() IS NULL) restano liberi, così seed e gestione admin funzionano.
-- ----------------------------------------------------------------------------
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

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- ----------------------------------------------------------------------------
-- RLS: profiles
--   SELECT  → propria riga | propri collaboratori (leader) | admin
--   UPDATE  → propria riga | admin  (il trigger blocca l'escalation)
--   INSERT  → admin        (la registrazione passa dal trigger definer)
--   DELETE  → admin
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or leader_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Tabelle PREDISPOSTE (vuote, con RLS) — nessuna integrazione ora.
-- Pattern RLS: lettura per owner/leader/admin, scrittura per owner/admin.
-- ----------------------------------------------------------------------------

-- trading_accounts (MT5 read-only, fase futura)
create table if not exists public.trading_accounts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  provider    text,
  login       text,
  server      text,
  created_at  timestamptz not null default now()
);
alter table public.trading_accounts enable row level security;

drop policy if exists trading_accounts_select on public.trading_accounts;
create policy trading_accounts_select on public.trading_accounts
  for select using (public.can_read_member(owner_id));

drop policy if exists trading_accounts_modify on public.trading_accounts;
create policy trading_accounts_modify on public.trading_accounts
  for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- trades
create table if not exists public.trades (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid references public.trading_accounts (id) on delete cascade,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  symbol      text,
  volume      numeric,
  profit      numeric,
  opened_at   timestamptz,
  closed_at   timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.trades enable row level security;

drop policy if exists trades_select on public.trades;
create policy trades_select on public.trades
  for select using (public.can_read_member(owner_id));

drop policy if exists trades_modify on public.trades;
create policy trades_modify on public.trades
  for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- feedback_posts (sezione Community, fase futura)
create table if not exists public.feedback_posts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  body        text,
  photo_url   text,
  created_at  timestamptz not null default now()
);
alter table public.feedback_posts enable row level security;

drop policy if exists feedback_posts_select on public.feedback_posts;
create policy feedback_posts_select on public.feedback_posts
  for select using (public.can_read_member(owner_id));

drop policy if exists feedback_posts_modify on public.feedback_posts;
create policy feedback_posts_modify on public.feedback_posts
  for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- Privilegi per il ruolo API "authenticated" (la RLS resta l'unico gate reale).
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.profiles, public.trading_accounts, public.trades, public.feedback_posts
  to authenticated;
