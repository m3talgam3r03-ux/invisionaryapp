-- ============================================================================
-- Invisionary — Migrazione 0003: rinnovi (`renewals`) + token push.
-- Prerequisito: 0001_init.sql, 0002_clients.sql.
-- Idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RENEWALS: scadenze/rinnovi legati a un cliente.
-- ----------------------------------------------------------------------------
create table if not exists public.renewals (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid references public.clients (id) on delete set null,
  owner_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  prodotto           text,
  scadenza           date not null,
  alert_days_before  integer not null default 30 check (alert_days_before >= 0),
  status             text not null default 'active' check (status in ('active', 'renewed', 'lost')),
  reminder_sent_at   timestamptz,
  created_at         timestamptz not null default now()
);

comment on table public.renewals is 'Scadenzario rinnovi; reminder_sent_at evita push duplicati.';

create index if not exists renewals_owner_id_idx on public.renewals (owner_id);
create index if not exists renewals_scadenza_idx on public.renewals (scadenza);

alter table public.renewals enable row level security;

drop policy if exists renewals_select on public.renewals;
create policy renewals_select on public.renewals
  for select using (public.can_read_member(owner_id));

drop policy if exists renewals_insert on public.renewals;
create policy renewals_insert on public.renewals
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists renewals_update on public.renewals;
create policy renewals_update on public.renewals
  for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists renewals_delete on public.renewals;
create policy renewals_delete on public.renewals
  for delete using (owner_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.renewals to authenticated;

-- ----------------------------------------------------------------------------
-- PUSH_TOKENS: token Expo per le notifiche push (uno o più per utente).
-- L'Edge Function (service_role) li legge per inviare gli avvisi.
-- ----------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  token       text not null unique,
  created_at  timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_select on public.push_tokens;
create policy push_tokens_select on public.push_tokens
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists push_tokens_insert on public.push_tokens;
create policy push_tokens_insert on public.push_tokens
  for insert with check (user_id = auth.uid());

drop policy if exists push_tokens_delete on public.push_tokens;
create policy push_tokens_delete on public.push_tokens
  for delete using (user_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.push_tokens to authenticated;
