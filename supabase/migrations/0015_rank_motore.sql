-- ============================================================================
-- Invisionary — Migrazione 0015: motore del rank configurabile.
-- Prerequisito: 0012 (rinnovi), 0014 (formazione).
-- Idempotente.
--
-- I pesi erano cablati in src/lib/rank.ts: cambiarli voleva dire un rilascio.
-- Ora stanno in `rank_rules` e i livelli in `rank_tiers`, modificabili
-- dall'admin. Il punteggio si ricalcola alla lettura successiva, senza deploy.
--
-- ⚠️ LE VISTE MATERIALIZZATE NON SUPPORTANO LA RLS.
-- Postgres non applica policy a una materialized view: darla in lettura a
-- `authenticated` significherebbe mostrare i punti di TUTTI. Per questo la
-- matview resta privata (nessun grant) e si esce solo dalla funzione
-- `classifica()`, che filtra con can_read_member(). È l'opposto della soluzione
-- adottata per le viste normali in 0014, dove bastava security_invoker.
--
-- DIVISIONE DEI COMPITI
--   matview  → conta le metriche (costoso, aggiornato su pianificazione)
--   funzioni → applicano i pesi (istantaneo, così cambiare una regola ha
--              effetto subito senza aspettare il refresh)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Regole: quanto vale ogni metrica.
--
--    Sul `period`: `lezioni_completate` e `clienti_acquisiti` sono EVENTI, e
--    contarli sul mese ha senso. `clienti_attivi` e `rinnovi_attivi` sono
--    STATI ATTUALI — "quanti ne hai adesso" — e un periodo non si applica: il
--    vincolo lo impone invece di lasciare configurazioni prive di significato.
-- ----------------------------------------------------------------------------
create table if not exists public.rank_rules (
  id              uuid primary key default gen_random_uuid(),
  metric          text not null check (metric in (
                    'lezioni_completate', 'clienti_attivi', 'clienti_acquisiti', 'rinnovi_attivi')),
  points_per_unit numeric not null check (points_per_unit >= 0),
  period          text not null default 'totale' check (period in ('mensile', 'totale')),
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (metric, period),
  constraint rank_rules_stato_solo_totale check (
    metric in ('lezioni_completate', 'clienti_acquisiti') or period = 'totale'
  )
);

comment on table public.rank_rules is
  'Quanto vale ogni metrica nel punteggio. Modificabile dall''admin: nessun rilascio necessario.';

-- ----------------------------------------------------------------------------
-- 2. Livelli: le carte da 2 ad Asso.
-- ----------------------------------------------------------------------------
create table if not exists public.rank_tiers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  min_points  numeric not null check (min_points >= 0),
  icon        text,
  order_index integer not null unique,
  created_at  timestamptz not null default now()
);

comment on table public.rank_tiers is
  'Livelli del rank in ordine crescente. `min_points` è la soglia di ingresso.';

-- ----------------------------------------------------------------------------
-- 3. Valori iniziali: gli stessi pesi e soglie già in uso, così nessuno vede
--    il proprio rank cambiare al momento della migrazione.
-- ----------------------------------------------------------------------------
insert into public.rank_rules (metric, points_per_unit, period)
values
  ('lezioni_completate', 10, 'totale'),
  ('clienti_attivi',      5, 'totale'),
  ('rinnovi_attivi',      3, 'totale'),
  ('clienti_acquisiti',   0, 'totale')   -- prevista ma a peso zero finché non la si vuole
on conflict (metric, period) do nothing;

insert into public.rank_tiers (name, min_points, order_index)
values
  ('2', 0, 0), ('3', 30, 1), ('4', 70, 2), ('5', 120, 3), ('6', 180, 4),
  ('7', 260, 5), ('8', 360, 6), ('9', 480, 7), ('10', 620, 8),
  ('J', 800, 9), ('Q', 1020, 10), ('K', 1300, 11), ('A', 1700, 12)
on conflict (order_index) do nothing;

-- ----------------------------------------------------------------------------
-- 4. RLS: le regole le leggono tutti (il punteggio deve essere trasparente),
--    le modifica solo l'admin.
-- ----------------------------------------------------------------------------
alter table public.rank_rules enable row level security;
alter table public.rank_tiers enable row level security;

drop policy if exists rank_rules_select on public.rank_rules;
create policy rank_rules_select on public.rank_rules
  for select using (auth.uid() is not null);
drop policy if exists rank_rules_write on public.rank_rules;
create policy rank_rules_write on public.rank_rules
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists rank_tiers_select on public.rank_tiers;
create policy rank_tiers_select on public.rank_tiers
  for select using (auth.uid() is not null);
drop policy if exists rank_tiers_write on public.rank_tiers;
create policy rank_tiers_write on public.rank_tiers
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.rank_rules, public.rank_tiers to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Le metriche, contate una volta sola.
--
--    Definizioni (sono la parte che conta, e vanno lette prima di cambiarle):
--      lezioni_completate  → righe in lesson_progress
--      clienti_acquisiti   → clienti creati (nel periodo)
--      clienti_attivi      → clienti con almeno un rinnovo attivo non scaduto
--      rinnovi_attivi      → rinnovi approvati con scadenza futura
-- ----------------------------------------------------------------------------
drop materialized view if exists public.mv_rank_metriche;
create materialized view public.mv_rank_metriche as
select
  p.id as user_id,

  (select count(*) from public.lesson_progress lp
    where lp.user_id = p.id)::integer                             as lezioni_completate_totale,

  (select count(*) from public.lesson_progress lp
    where lp.user_id = p.id
      and lp.completed_at >= date_trunc('month', now()))::integer as lezioni_completate_mensile,

  (select count(*) from public.clients c
    where c.owner_id = p.id)::integer                             as clienti_acquisiti_totale,

  (select count(*) from public.clients c
    where c.owner_id = p.id
      and c.created_at >= date_trunc('month', now()))::integer    as clienti_acquisiti_mensile,

  (select count(distinct r.client_id) from public.renewals r
    where r.owner_id = p.id
      and r.status = 'attivo'
      and r.current_due_date >= current_date
      and r.client_id is not null)::integer                       as clienti_attivi_totale,

  (select count(*) from public.renewals r
    where r.owner_id = p.id
      and r.status = 'attivo'
      and r.current_due_date >= current_date)::integer            as rinnovi_attivi_totale
from public.profiles p;

-- Serve per il refresh CONCURRENTLY, che non blocca chi sta leggendo.
create unique index if not exists mv_rank_metriche_user_idx
  on public.mv_rank_metriche (user_id);

-- Nessun grant: la matview non ha RLS, quindi non esce mai direttamente.
revoke all on public.mv_rank_metriche from authenticated, anon, public;

-- ----------------------------------------------------------------------------
-- 6. Ricalcolo. La chiama la pianificazione oraria e, all'occorrenza, l'app
--    dopo un evento che cambia le metriche.
-- ----------------------------------------------------------------------------
create or replace function public.refresh_rank()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- CONCURRENTLY non blocca le letture, ma al primo popolamento non è
  -- ammesso: si ripiega sul refresh normale.
  begin
    refresh materialized view concurrently public.mv_rank_metriche;
  exception when others then
    refresh materialized view public.mv_rank_metriche;
  end;
end;
$$;

revoke execute on function public.refresh_rank() from anon, public;

-- ----------------------------------------------------------------------------
-- 7. Punteggio: metriche × regole attive. Applicato alla lettura, così
--    cambiare un peso ha effetto subito, senza aspettare il refresh.
-- ----------------------------------------------------------------------------
create or replace function public.punti_utente(u uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    rr.points_per_unit * case
      when rr.metric = 'lezioni_completate' and rr.period = 'mensile' then m.lezioni_completate_mensile
      when rr.metric = 'lezioni_completate'                            then m.lezioni_completate_totale
      when rr.metric = 'clienti_acquisiti'  and rr.period = 'mensile' then m.clienti_acquisiti_mensile
      when rr.metric = 'clienti_acquisiti'                             then m.clienti_acquisiti_totale
      when rr.metric = 'clienti_attivi'                                then m.clienti_attivi_totale
      when rr.metric = 'rinnovi_attivi'                                then m.rinnovi_attivi_totale
      else 0
    end
  ), 0)
  from public.mv_rank_metriche m
  cross join public.rank_rules rr
  where m.user_id = u and rr.active;
$$;

-- ----------------------------------------------------------------------------
-- 8. La classifica, con il perimetro applicato a mano.
--    Qui non c'è RLS che protegga (la matview non ne ha): il filtro
--    can_read_member() È la protezione.
-- ----------------------------------------------------------------------------
create or replace function public.classifica()
returns table (
  user_id            uuid,
  full_name          text,
  role               text,
  punti              numeric,
  tier_name          text,
  tier_order         integer,
  prossimo_tier      text,
  punti_al_prossimo  numeric,
  lezioni_completate integer,
  clienti_acquisiti  integer,
  clienti_attivi     integer,
  rinnovi_attivi     integer
)
language sql
stable
security definer
set search_path = public
as $$
  with punteggi as (
    select m.*, public.punti_utente(m.user_id) as punti
    from public.mv_rank_metriche m
    where public.can_read_member(m.user_id)      -- ← il perimetro, qui e solo qui
  ),
  con_tier as (
    select
      p.*,
      (select t.name from public.rank_tiers t
        where t.min_points <= p.punti order by t.min_points desc limit 1) as tier_name,
      (select t.order_index from public.rank_tiers t
        where t.min_points <= p.punti order by t.min_points desc limit 1) as tier_order,
      (select t.name from public.rank_tiers t
        where t.min_points > p.punti order by t.min_points asc limit 1)   as prossimo_tier,
      (select t.min_points - p.punti from public.rank_tiers t
        where t.min_points > p.punti order by t.min_points asc limit 1)   as punti_al_prossimo
    from punteggi p
  )
  select
    c.user_id,
    pr.full_name,
    pr.role,
    c.punti,
    c.tier_name,
    c.tier_order,
    c.prossimo_tier,
    c.punti_al_prossimo,
    c.lezioni_completate_totale,
    c.clienti_acquisiti_totale,
    c.clienti_attivi_totale,
    c.rinnovi_attivi_totale
  from con_tier c
  join public.profiles pr on pr.id = c.user_id
  order by c.punti desc, pr.full_name asc;
$$;

grant execute on function public.classifica() to authenticated;
grant execute on function public.punti_utente(uuid) to authenticated;
revoke execute on function public.classifica() from anon;
revoke execute on function public.punti_utente(uuid) from anon;

-- Primo popolamento.
select public.refresh_rank();
