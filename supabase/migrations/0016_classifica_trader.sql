-- ============================================================================
-- Invisionary — Migrazione 0016: classifica trader per win rate.
-- Prerequisito: 0008_trading.sql, 0011 (is_admin), 0001 (can_read_member).
-- Idempotente.
--
-- IL PROBLEMA DA RISOLVERE PRIMA
-- `trades` contiene i DEAL di MetaApi, che sono eventi puntuali: un ingresso e
-- un'uscita sono due righe distinte. Senza `position_id` non si può sapere né
-- se un'operazione si è chiusa in utile né quanto è durata — quindi né win rate
-- né l'esclusione dei trade sotto il minuto. La colonna arriva qui, e mt5-sync
-- viene aggiornata per popolarla.
--
-- COMPLIANCE (vincolo di prodotto, non un dettaglio)
-- In classifica non compaiono MAI percentuali di guadagno né importi. Escono
-- solo win rate (quota di operazioni chiuse in utile) e numero di operazioni.
-- Il profit factor si calcola, ma serve solo a rompere la parità: non esce.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La colonna che mancava.
-- ----------------------------------------------------------------------------
alter table public.trades add column if not exists position_id text;

create index if not exists trades_position_idx
  on public.trades (account_id, position_id);

comment on column public.trades.position_id is
  'Id posizione MetaApi: lega ingresso e uscita. Senza questo un deal resta un evento isolato.';

-- ----------------------------------------------------------------------------
-- 2. Le operazioni ricomposte dai deal.
--    Un''operazione è CHIUSA se ha almeno un deal di uscita.
--    security_invoker: il perimetro resta quello della RLS di `trades`.
-- ----------------------------------------------------------------------------
drop view if exists public.v_operazioni;
create view public.v_operazioni
with (security_invoker = on)
as
select
  t.owner_id,
  t.account_id,
  t.position_id,
  min(t.symbol)                                                          as symbol,
  min(t.time) filter (where t.entry_type = 'DEAL_ENTRY_IN')              as aperta_il,
  max(t.time) filter (where t.entry_type like 'DEAL_ENTRY_OUT%')         as chiusa_il,
  sum(coalesce(t.profit, 0) + coalesce(t.commission, 0) + coalesce(t.swap, 0)) as risultato,
  extract(epoch from (
    max(t.time) filter (where t.entry_type like 'DEAL_ENTRY_OUT%')
    - min(t.time) filter (where t.entry_type = 'DEAL_ENTRY_IN')
  ))::numeric                                                            as durata_secondi
from public.trades t
where t.position_id is not null
group by t.owner_id, t.account_id, t.position_id
having count(*) filter (where t.entry_type like 'DEAL_ENTRY_OUT%') > 0;

comment on view public.v_operazioni is
  'Operazioni chiuse, ricomposte dai deal per position_id. La durata serve a escludere lo scalping artificiale.';

grant select on public.v_operazioni to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Parametri della classifica, modificabili senza rilascio.
-- ----------------------------------------------------------------------------
create table if not exists public.trading_config (
  id                    boolean primary key default true check (id),  -- riga unica
  min_trade_periodo     integer not null default 20 check (min_trade_periodo >= 0),
  durata_minima_secondi integer not null default 60 check (durata_minima_secondi >= 0),
  updated_at            timestamptz not null default now()
);

insert into public.trading_config (id) values (true) on conflict (id) do nothing;

comment on table public.trading_config is
  'Soglie della classifica trader. Riga unica: il check su id la impone.';

alter table public.trading_config enable row level security;

drop policy if exists trading_config_select on public.trading_config;
create policy trading_config_select on public.trading_config
  for select using (auth.uid() is not null);
drop policy if exists trading_config_write on public.trading_config;
create policy trading_config_write on public.trading_config
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.trading_config to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Chi conduce le call VIP: lo assegna l'admin.
--    Il trigger anti-escalation di 0001 protegge solo role e leader_id, quindi
--    questa colonna va difesa a parte: senza, chiunque si darebbe il badge.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists vip_call_host boolean not null default false;

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role          := old.role;
    new.leader_id     := old.leader_id;
    new.vip_call_host := old.vip_call_host;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Il podio congelato: una volta chiuso il mese non cambia più.
-- ----------------------------------------------------------------------------
create table if not exists public.leaderboard_snapshots (
  id          uuid primary key default gen_random_uuid(),
  periodo     date not null,                      -- primo giorno del mese
  posizione   integer not null check (posizione between 1 and 3),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  win_rate    numeric not null,
  trade_count integer not null,
  created_at  timestamptz not null default now(),
  unique (periodo, posizione)
);

comment on table public.leaderboard_snapshots is
  'Podio mensile congelato. La storia non si riscrive: nuovi trade non cambiano un mese chiuso.';

alter table public.leaderboard_snapshots enable row level security;

-- Il podio è pubblico all'interno della rete: è un riconoscimento, e mostra
-- solo posizione e win rate. Scrive solo la funzione di congelamento.
drop policy if exists leaderboard_snapshots_select on public.leaderboard_snapshots;
create policy leaderboard_snapshots_select on public.leaderboard_snapshots
  for select using (auth.uid() is not null);

grant select on public.leaderboard_snapshots to authenticated;

-- ----------------------------------------------------------------------------
-- 6. La classifica.
--
--    Vincoli, tutti obbligatori:
--      · solo conti collegati a MetaApi (niente risultati dichiarati a mano);
--      · operazioni sotto la durata minima escluse (anti scalping artificiale);
--      · sotto la soglia di operazioni si resta «non classificato»;
--      · parità risolta con profit factor → numero operazioni → data iscrizione.
--
--    `classificato` esce come flag invece di tagliare le righe: l'interfaccia
--    mostra chi non è ancora in classifica, che è informazione utile.
-- ----------------------------------------------------------------------------
create or replace function public.classifica_trader(dal date default null, al date default null)
returns table (
  user_id        uuid,
  full_name      text,
  vip_call_host  boolean,
  operazioni     integer,
  win_rate       numeric,
  classificato   boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with cfg as (
    select min_trade_periodo, durata_minima_secondi from public.trading_config where id
  ),
  intervallo as (
    select
      coalesce(dal, date_trunc('month', current_date)::date)                         as dal,
      coalesce(al, (date_trunc('month', current_date) + interval '1 month')::date)   as al
  ),
  valide as (
    select o.owner_id, o.risultato
    from public.v_operazioni o
    join public.trading_accounts ta on ta.id = o.account_id
    cross join cfg
    cross join intervallo i
    where ta.metaapi_account_id is not null           -- conto verificato
      and o.chiusa_il >= i.dal
      and o.chiusa_il <  i.al
      and o.durata_secondi >= cfg.durata_minima_secondi
  ),
  aggregate as (
    select
      v.owner_id,
      count(*)::integer                                        as operazioni,
      count(*) filter (where v.risultato > 0)::integer         as vincenti,
      sum(v.risultato) filter (where v.risultato > 0)          as lordo_utili,
      abs(sum(v.risultato) filter (where v.risultato < 0))     as lordo_perdite
    from valide v
    group by v.owner_id
  )
  select
    p.id,
    p.full_name,
    p.vip_call_host,
    coalesce(a.operazioni, 0),
    case
      when coalesce(a.operazioni, 0) = 0 then 0
      else round(a.vincenti * 100.0 / a.operazioni, 1)
    end                                                        as win_rate,
    coalesce(a.operazioni, 0) >= (select min_trade_periodo from cfg) as classificato
  from public.profiles p
  left join aggregate a on a.owner_id = p.id
  where public.can_read_member(p.id)
  order by
    (coalesce(a.operazioni, 0) >= (select min_trade_periodo from cfg)) desc,
    case when coalesce(a.operazioni, 0) = 0 then 0
         else a.vincenti * 100.0 / a.operazioni end desc,
    -- Parità: profit factor, poi numero di operazioni, poi anzianità.
    case when coalesce(a.lordo_perdite, 0) = 0 then 999999
         else a.lordo_utili / a.lordo_perdite end desc nulls last,
    coalesce(a.operazioni, 0) desc,
    p.created_at asc;
$$;

grant execute on function public.classifica_trader(date, date) to authenticated;
revoke execute on function public.classifica_trader(date, date) from anon;

-- ----------------------------------------------------------------------------
-- 7. Congelamento del podio. Idempotente: rieseguirlo non altera un mese già
--    chiuso, perché il vincolo di unicità rifiuta il doppione.
-- ----------------------------------------------------------------------------
create or replace function public.congela_podio(mese date default (date_trunc('month', current_date - interval '1 month'))::date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inseriti integer;
begin
  insert into public.leaderboard_snapshots (periodo, posizione, user_id, win_rate, trade_count)
  select
    mese,
    row_number() over ()::integer,
    c.user_id,
    c.win_rate,
    c.operazioni
  from public.classifica_trader(mese, (mese + interval '1 month')::date) c
  where c.classificato
  limit 3
  on conflict (periodo, posizione) do nothing;

  get diagnostics inseriti = row_count;
  return inseriti;
end;
$$;

revoke execute on function public.congela_podio(date) from authenticated, anon, public;
