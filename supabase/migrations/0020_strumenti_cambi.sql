-- ============================================================================
-- Invisionary — Migrazione 0020: strumenti finanziari e cache dei cambi.
-- Prerequisito: 0011 (is_admin).
-- Idempotente.
--
-- Gli strumenti stanno in tabella e non nel codice: aggiungere una coppia o
-- correggere la dimensione di un contratto non deve richiedere un rilascio.
--
-- I cambi si mettono in cache con una scadenza. Se il fornitore non risponde,
-- il calcolatore usa l'ultimo valore noto e mostra di quando è: bloccare il
-- calcolo sarebbe peggio di un tasso vecchio di un'ora, perché chi deve aprire
-- una posizione lo farebbe comunque, a occhio.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Gli strumenti.
--
--    `contract_size` = quante unità vale un lotto standard.
--    `pip_size`      = di quanto si muove il prezzo in un pip.
--    `quote_currency`= in quale valuta è espresso il prezzo: è la chiave della
--                      conversione, ed è il punto in cui si sbaglia più spesso.
-- ----------------------------------------------------------------------------
create table if not exists public.instruments (
  id             uuid primary key default gen_random_uuid(),
  symbol         text not null unique,
  tipo           text not null check (tipo in ('forex', 'indice', 'metallo', 'energia', 'cripto')),
  contract_size  numeric not null check (contract_size > 0),
  quote_currency text not null,
  pip_size       numeric not null check (pip_size > 0),
  -- Etichetta dell'unità: «pip» per il forex, «punto» per indici e metalli.
  unita          text not null default 'pip',
  attivo         boolean not null default true,
  ordine         integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists instruments_tipo_idx on public.instruments (tipo, ordine);

comment on table public.instruments is
  'Strumenti del calcolatore di lottaggio. In tabella e non nel codice: si aggiungono senza rilasci.';
comment on column public.instruments.contract_size is
  'Unità per lotto standard. Sugli indici varia da broker a broker: l''app permette di sovrascriverlo.';

alter table public.instruments enable row level security;

drop policy if exists instruments_select on public.instruments;
create policy instruments_select on public.instruments
  for select using (auth.uid() is not null);
drop policy if exists instruments_write on public.instruments;
create policy instruments_write on public.instruments
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.instruments to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Catalogo iniziale.
--    Le convenzioni variano fra broker: questi sono i valori più comuni, e
--    restano modificabili senza toccare il codice.
-- ----------------------------------------------------------------------------
insert into public.instruments (symbol, tipo, contract_size, quote_currency, pip_size, unita, ordine)
values
  -- Forex maggiori
  ('EUR/USD', 'forex',  100000, 'USD', 0.0001, 'pip',   10),
  ('GBP/USD', 'forex',  100000, 'USD', 0.0001, 'pip',   11),
  ('USD/JPY', 'forex',  100000, 'JPY', 0.01,   'pip',   12),
  ('USD/CHF', 'forex',  100000, 'CHF', 0.0001, 'pip',   13),
  ('USD/CAD', 'forex',  100000, 'CAD', 0.0001, 'pip',   14),
  ('AUD/USD', 'forex',  100000, 'USD', 0.0001, 'pip',   15),
  ('NZD/USD', 'forex',  100000, 'USD', 0.0001, 'pip',   16),
  -- Forex minori
  ('EUR/GBP', 'forex',  100000, 'GBP', 0.0001, 'pip',   20),
  ('EUR/JPY', 'forex',  100000, 'JPY', 0.01,   'pip',   21),
  ('GBP/JPY', 'forex',  100000, 'JPY', 0.01,   'pip',   22),
  ('EUR/CHF', 'forex',  100000, 'CHF', 0.0001, 'pip',   23),
  ('AUD/JPY', 'forex',  100000, 'JPY', 0.01,   'pip',   24),
  -- Indici (contract_size tipico: 1 unità di valuta per punto)
  ('US30',    'indice',      1, 'USD', 1,      'punto', 30),
  ('NAS100',  'indice',      1, 'USD', 1,      'punto', 31),
  ('SPX500',  'indice',      1, 'USD', 1,      'punto', 32),
  ('GER40',   'indice',      1, 'EUR', 1,      'punto', 33),
  ('UK100',   'indice',      1, 'GBP', 1,      'punto', 34),
  ('JP225',   'indice',      1, 'JPY', 1,      'punto', 35),
  -- Metalli
  ('XAU/USD', 'metallo',   100, 'USD', 0.01,   'punto', 40),
  ('XAG/USD', 'metallo',  5000, 'USD', 0.001,  'punto', 41)
on conflict (symbol) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Cache dei cambi.
--    Una riga per coppia: il valore corrente e quando è stato preso. La data
--    non è un dettaglio — è ciò che permette all'app di dire «tasso di un'ora
--    fa» invece di far credere che sia aggiornato.
-- ----------------------------------------------------------------------------
create table if not exists public.fx_rates (
  base       text not null,
  quote      text not null,
  rate       numeric not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  primary key (base, quote)
);

comment on table public.fx_rates is
  'Ultimo cambio noto per coppia, con l''istante in cui è stato preso. Scritta solo dalla Edge Function.';

alter table public.fx_rates enable row level security;

-- Lettura per tutti gli autenticati; la scrittura è della Edge Function, che
-- usa la service_role e scavalca la RLS. Nessuna policy di scrittura, di
-- proposito: un tasso inventato da un client falserebbe ogni calcolo.
drop policy if exists fx_rates_select on public.fx_rates;
create policy fx_rates_select on public.fx_rates
  for select using (auth.uid() is not null);

grant select on public.fx_rates to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Il cambio da usare adesso.
--    Restituisce anche l'età del dato, così l'interfaccia può dire da quanto
--    tempo non si aggiorna invece di mostrarlo come fresco.
-- ----------------------------------------------------------------------------
create or replace function public.cambio(base_ccy text, quote_ccy text)
returns table (rate numeric, fetched_at timestamptz, minuti_fa integer)
language sql
stable
security definer
set search_path = public
as $$
  -- Valute diverse: serve il fornitore. Il left join è voluto — se la coppia
  -- non c'è si restituisce una riga con `rate` nullo, così il chiamante sa che
  -- il dato manca invece di ricevere zero righe e doverlo indovinare.
  select
    f.rate,
    f.fetched_at,
    (extract(epoch from (now() - f.fetched_at)) / 60)::integer
  from (select 1) dummy
  left join public.fx_rates f
    on f.base = upper(base_ccy) and f.quote = upper(quote_ccy)
  where upper(base_ccy) <> upper(quote_ccy)

  union all

  -- Stessa valuta: il cambio è 1 e non serve nessun fornitore.
  select 1::numeric, now(), 0
  where upper(base_ccy) = upper(quote_ccy);
$$;

grant execute on function public.cambio(text, text) to authenticated;
revoke execute on function public.cambio(text, text) from anon;
