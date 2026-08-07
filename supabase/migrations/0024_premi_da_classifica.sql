-- ============================================================================
-- Invisionary — Migrazione 0024: i punti premio arrivano dalla classifica
-- trader mensile, e il podio si vede.
-- Prerequisiti: 0016 (classifica trader), 0023 (punti premio).
-- Idempotente.
--
-- COSA CAMBIA RISPETTO ALLA 0023
-- I punti non maturano più da lezioni e clienti: si vincono con la posizione
-- nella classifica del mese. `points_rules`, `points_accrual` e `matura_punti()`
-- non servono più e vengono rimossi.
--
-- ⚠️ CONSEGUENZA DA SAPERE: chi non fa trading non guadagna più punti da solo.
-- Restano i bonus assegnati dall'admin. Se serve premiare anche formazione e
-- CRM, si riaggiunge una seconda sorgente — ma va deciso, non lasciato al caso.
--
-- ── DUE DIFETTI DELLA 0016 CHE QUI VENGONO CHIUSI ──
--
-- 1. `congela_podio()` NON FUNZIONAVA DA CRON. Chiamava `classifica_trader()`,
--    che filtra con `can_read_member(p.id)`. Da pg_cron non c'è nessun utente
--    autenticato: `auth.uid()` è NULL, quel predicato vale NULL per ogni riga,
--    e il podio veniva congelato VUOTO senza che nessuno se ne accorgesse.
--    Qui la graduatoria si calcola con una funzione interna che non filtra per
--    visibilità, e il filtro resta solo sulla classifica che si mostra a video.
--
-- 2. IL PODIO NON ERA LEGGIBILE. `leaderboard_snapshots` è pubblico dentro la
--    rete, ma contiene solo `user_id`: per il nome serve `profiles`, che un
--    collaboratore vede solo per sé stesso. Il podio sarebbe uscito con tre
--    identificativi e nessun nome. `podio()` restituisce anche i nomi.
--
-- ── UNA COSA SUL WIN RATE ──
-- Un podio premiato sul solo win rate incoraggia il profilo di rischio
-- sbagliato: si può vincere il 95% delle volte e perdere soldi, se le poche
-- operazioni negative sono enormi (niente stop loss, mediare al ribasso). È il
-- modo più comune di bruciare un conto, e premiarlo pubblicamente lo insegna.
-- Per questo qui si aggiunge una soglia di **profit factor** per essere
-- premiabili: di base 1.0, cioè bisogna almeno non perdere. Si cambia in
-- `trading_config`, e mettendola a 0 si torna al comportamento precedente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La soglia che evita di premiare chi vince spesso e perde tanto.
-- ----------------------------------------------------------------------------
alter table public.trading_config
  add column if not exists min_profit_factor numeric not null default 1.0
    check (min_profit_factor >= 0);

comment on column public.trading_config.min_profit_factor is
  'Profit factor minimo per entrare a podio e prendere punti. 1.0 = almeno non perdere. A 0 il filtro è spento.';

-- ----------------------------------------------------------------------------
-- 2. La graduatoria del mese, senza filtro di visibilità.
--
--    Serve a due cose che devono vedere TUTTI i partecipanti, non solo quelli
--    che il chiamante può leggere: congelare il podio e assegnare i punti.
--    Non è esposta agli utenti: la classifica che si mostra a video resta
--    `classifica_trader()`, che filtra.
-- ----------------------------------------------------------------------------
create or replace function public.graduatoria_mese(mese date)
returns table (
  posizione     integer,
  user_id       uuid,
  win_rate      numeric,
  operazioni    integer,
  profit_factor numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with cfg as (
    select min_trade_periodo, durata_minima_secondi, min_profit_factor
    from public.trading_config where id
  ),
  valide as (
    select o.owner_id, o.risultato
    from public.v_operazioni o
    join public.trading_accounts ta on ta.id = o.account_id
    cross join cfg
    where ta.metaapi_account_id is not null
      and o.chiusa_il >= mese
      and o.chiusa_il <  (mese + interval '1 month')
      and o.durata_secondi >= cfg.durata_minima_secondi
  ),
  aggregate as (
    select
      v.owner_id,
      count(*)::integer                                    as operazioni,
      count(*) filter (where v.risultato > 0)::integer     as vincenti,
      coalesce(sum(v.risultato) filter (where v.risultato > 0), 0)       as utili,
      abs(coalesce(sum(v.risultato) filter (where v.risultato < 0), 0))  as perdite
    from valide v
    group by v.owner_id
  ),
  calcolata as (
    select
      a.owner_id,
      a.operazioni,
      round(a.vincenti * 100.0 / a.operazioni, 1) as win_rate,
      -- Senza perdite il profit factor è infinito: si usa un numero grande
      -- invece di dividere per zero.
      case when a.perdite = 0 then 999999 else a.utili / a.perdite end as pf
    from aggregate a
    cross join cfg
    where a.operazioni >= cfg.min_trade_periodo
  )
  select
    row_number() over (order by c.win_rate desc, c.pf desc, c.operazioni desc)::integer,
    c.owner_id,
    c.win_rate,
    c.operazioni,
    round(c.pf, 2)
  from calcolata c
  cross join cfg
  where c.pf >= cfg.min_profit_factor;
$$;

comment on function public.graduatoria_mese(date) is
  'Graduatoria del mese SENZA filtro di visibilità. Uso interno: congelamento del podio e assegnazione punti.';

revoke execute on function public.graduatoria_mese(date) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Congelamento del podio, corretto.
-- ----------------------------------------------------------------------------
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
  select mese, g.posizione, g.user_id, g.win_rate, g.operazioni
  from public.graduatoria_mese(mese) g
  where g.posizione <= 3
  on conflict (periodo, posizione) do nothing;

  get diagnostics inseriti = row_count;
  return inseriti;
end;
$$;

revoke execute on function public.congela_podio(date) from authenticated, anon, public;

-- ----------------------------------------------------------------------------
-- 4. Il podio, leggibile da tutta la rete.
--
--    SECURITY DEFINER perché deve restituire i NOMI dei primi tre, e i profili
--    altrui un collaboratore non li vede. Escono solo posizione, nome e win
--    rate: nessun importo, nessuna percentuale di guadagno. È un vincolo di
--    prodotto, e questa funzione è il punto in cui va rispettato.
-- ----------------------------------------------------------------------------
create or replace function public.podio(
  mese date default (date_trunc('month', current_date - interval '1 month'))::date
)
returns table (
  posizione   integer,
  user_id     uuid,
  nome        text,
  win_rate    numeric,
  operazioni  integer
)
language sql
stable
security definer
set search_path = public
as $$
  select s.posizione, s.user_id, p.full_name, s.win_rate, s.trade_count
  from public.leaderboard_snapshots s
  join public.profiles p on p.id = s.user_id
  where s.periodo = mese
  order by s.posizione;
$$;

grant execute on function public.podio(date) to authenticated;
revoke execute on function public.podio(date) from anon;

-- ----------------------------------------------------------------------------
-- 5. Quanti punti vale ogni posizione.
-- ----------------------------------------------------------------------------
create table if not exists public.points_classifica_regole (
  posizione integer primary key check (posizione >= 1),
  punti     numeric not null check (punti > 0)
);

insert into public.points_classifica_regole (posizione, punti)
values (1, 500), (2, 300), (3, 200), (4, 120), (5, 100),
       (6, 60), (7, 60), (8, 60), (9, 60), (10, 60)
on conflict (posizione) do nothing;

alter table public.points_classifica_regole enable row level security;

drop policy if exists points_classifica_regole_select on public.points_classifica_regole;
create policy points_classifica_regole_select on public.points_classifica_regole
  for select using (auth.uid() is not null);
drop policy if exists points_classifica_regole_write on public.points_classifica_regole;
create policy points_classifica_regole_write on public.points_classifica_regole
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.points_classifica_regole to authenticated;

-- Chi ha già preso i punti di quale mese. La chiave primaria è ciò che rende
-- impossibile pagare due volte lo stesso mese, anche rilanciando il cron.
create table if not exists public.points_classifica_assegnati (
  periodo   date not null,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  posizione integer not null,
  punti     numeric not null,
  assegnato_il timestamptz not null default now(),
  primary key (periodo, user_id)
);

comment on table public.points_classifica_assegnati is
  'Punti già assegnati per un mese. La chiave primaria impedisce il doppio pagamento.';

alter table public.points_classifica_assegnati enable row level security;

drop policy if exists points_classifica_assegnati_select on public.points_classifica_assegnati;
create policy points_classifica_assegnati_select on public.points_classifica_assegnati
  for select using (public.can_read_member(user_id));

grant select on public.points_classifica_assegnati to authenticated;

-- ----------------------------------------------------------------------------
-- 6. «classifica» diventa un'origine valida nel registro.
-- ----------------------------------------------------------------------------
alter table public.points_ledger drop constraint if exists points_ledger_origine_check;
alter table public.points_ledger add constraint points_ledger_origine_check
  check (origine in ('classifica', 'bonus', 'riscatto', 'rimborso', 'maturazione'));

-- ----------------------------------------------------------------------------
-- 7. Assegnazione dei punti del mese.
--
--    Da schedulare dopo `congela_podio()`. Ripetibile: la chiave primaria di
--    `points_classifica_assegnati` fa sì che la seconda esecuzione non paghi
--    nulla.
-- ----------------------------------------------------------------------------
create or replace function public.assegna_punti_classifica(
  mese date default (date_trunc('month', current_date - interval '1 month'))::date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  premiati integer := 0;
  r record;
begin
  for r in
    select g.posizione, g.user_id, pr.punti
    from public.graduatoria_mese(mese) g
    join public.points_classifica_regole pr on pr.posizione = g.posizione
    order by g.posizione
  loop
    -- Chi ha già preso i punti di questo mese non li riprende: l'insert viene
    -- scartata e la riga nel registro non si scrive.
    insert into public.points_classifica_assegnati (periodo, user_id, posizione, punti)
    values (mese, r.user_id, r.posizione, r.punti)
    on conflict (periodo, user_id) do nothing;

    if found then
      insert into public.points_ledger (user_id, delta, origine, motivo)
      values (r.user_id, r.punti, 'classifica',
              to_char(mese, 'MM/YYYY') || ' — ' || r.posizione || '° posto');
      premiati := premiati + 1;
    end if;
  end loop;

  return premiati;
end;
$$;

comment on function public.assegna_punti_classifica(date) is
  'Assegna i punti della classifica del mese. Ripetibile: la seconda esecuzione non paga nulla.';

revoke execute on function public.assegna_punti_classifica(date) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. Via la maturazione da lezioni e clienti: i punti ora vengono dalla
--    classifica. Le righe già accreditate restano nel registro — è storia, e
--    la storia non si riscrive.
-- ----------------------------------------------------------------------------
drop function if exists public.matura_punti(uuid);
drop table if exists public.points_accrual;
drop table if exists public.points_rules;
