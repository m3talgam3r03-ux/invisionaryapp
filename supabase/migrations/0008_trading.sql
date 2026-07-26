-- ============================================================================
-- Invisionary — Migrazione 0008: MT5 read-only (MetaApi).
-- Estende le tabelle già predisposte trading_accounts e trades (0001).
-- La investor password NON viene salvata qui: passa dalla Edge Function a MetaApi.
-- Idempotente.
-- ============================================================================

-- trading_accounts: riferimento MetaApi + stato + saldo sincronizzato.
alter table public.trading_accounts add column if not exists metaapi_account_id text;
alter table public.trading_accounts add column if not exists platform text;      -- mt4 | mt5
alter table public.trading_accounts add column if not exists region text default 'new-york';
alter table public.trading_accounts add column if not exists state text;         -- stato MetaApi/sync
alter table public.trading_accounts add column if not exists name text;
alter table public.trading_accounts add column if not exists balance numeric;
alter table public.trading_accounts add column if not exists equity numeric;
alter table public.trading_accounts add column if not exists currency text;
alter table public.trading_accounts add column if not exists last_synced_at timestamptz;

-- trades: mappa i "deal" MetaApi (dedup per account + id esterno).
alter table public.trades add column if not exists external_id text;
alter table public.trades add column if not exists type text;         -- DEAL_TYPE_BUY | DEAL_TYPE_SELL
alter table public.trades add column if not exists price numeric;
alter table public.trades add column if not exists commission numeric;
alter table public.trades add column if not exists swap numeric;
alter table public.trades add column if not exists entry_type text;   -- DEAL_ENTRY_IN | OUT | ...
alter table public.trades add column if not exists time timestamptz;

create unique index if not exists trades_account_external_idx
  on public.trades (account_id, external_id);
create index if not exists trades_account_time_idx on public.trades (account_id, time desc);

-- La RLS di trading_accounts e trades è già definita in 0001 (owner/leader-read/admin).
