-- ============================================================================
-- Annulla la migrazione 0024 (premi dalla classifica trader).
--
-- ⚠️ Cancella la traccia di quali mesi sono già stati pagati. Le righe nel
-- registro dei punti restano — sono storia — ma riapplicando la 0024 e
-- rilanciando `assegna_punti_classifica()` gli stessi mesi verrebbero PAGATI
-- DI NUOVO, perché è `points_classifica_assegnati` a impedirlo.
-- Esporta prima:
--
--   copy (select * from public.points_classifica_assegnati) to stdout with csv header;
--
-- Non ripristina `points_rules`, `points_accrual` e `matura_punti()`: per
-- riaverli si riapplica la 0023.
-- ============================================================================

drop function if exists public.assegna_punti_classifica(date);
drop function if exists public.podio(date);
drop function if exists public.graduatoria_mese(date);

drop table if exists public.points_classifica_assegnati;
drop table if exists public.points_classifica_regole;

-- Il vincolo torna com'era nella 0023.
alter table public.points_ledger drop constraint if exists points_ledger_origine_check;
alter table public.points_ledger add constraint points_ledger_origine_check
  check (origine in ('maturazione', 'bonus', 'riscatto', 'rimborso'));

alter table public.trading_config drop column if exists min_profit_factor;

-- `congela_podio()` torna alla versione della 0016 — con il difetto noto: da
-- cron congela un podio vuoto, perché classifica_trader() filtra per
-- visibilità e senza utente autenticato non vede nessuno.
create or replace function public.congela_podio(
  mese date default (date_trunc('month', current_date - interval '1 month'))::date
)
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
