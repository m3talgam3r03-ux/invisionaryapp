-- ============================================================================
-- Invisionary — Migrazione 0025: la mappa degli iscritti per regione.
-- Prerequisiti: 0011 (is_admin), 0016 (protect_profile_privileged_columns).
-- Idempotente.
--
-- Serve a vedere quante persone ci sono in ogni regione. Sembra innocuo, e
-- quasi lo è — ma un conteggio per area GEOGRAFICA su un gruppo piccolo smette
-- in fretta di essere un aggregato.
--
-- ── IL PROBLEMA DEI NUMERI PICCOLI ──
-- «Molise: 1» non è una statistica: è una persona. Chiunque nella rete sappia
-- che Tizio è molisano ha appena scoperto che Tizio è l'unico iscritto lì, e
-- ogni altro dato regionale che aggiungessimo in futuro parlerebbe di lui.
-- Per questo le regioni sotto la soglia restituiscono NULL, e la soppressione
-- avviene QUI e non nell'interfaccia: nascondere un numero già arrivato sul
-- telefono non lo protegge.
--
-- ── E IL PROBLEMA DELLA SOTTRAZIONE ──
-- Sopprimere una cella e mostrare il totale generale è inutile: si ricava per
-- differenza. Per questo la funzione restituisce il totale delle sole regioni
-- MOSTRATE, più quante regioni sono state nascoste — mai la loro somma.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La regione, dichiarata da chi si iscrive.
--
--    Facoltativa: chi non vuole dirla non la dice, e resta fuori dalla mappa.
--    Il CHECK tiene l'elenco chiuso alle 20 regioni ufficiali: senza, la mappa
--    si riempirebbe di «lombardia», «Lombardia », «LOMBARDIA».
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists regione text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_regione_valida'
  ) then
    alter table public.profiles
      add constraint profiles_regione_valida check (
        regione is null or regione in (
          'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
          'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
          'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
          'Trentino-Alto Adige', 'Umbria', 'Valle d''Aosta', 'Veneto'
        )
      );
  end if;
end $$;

comment on column public.profiles.regione is
  'Regione dichiarata dall''iscritto. Facoltativa. Esce solo aggregata, mai per riga.';

create index if not exists profiles_regione_idx on public.profiles (regione);

-- ----------------------------------------------------------------------------
-- 2. La mappa.
--
--    SECURITY DEFINER perché un collaboratore vede solo il proprio profilo:
--    per contare tutti bisogna scavalcare la RLS. Il che va fatto restituendo
--    SOLO conteggi — nessun id, nessun nome, nessuna riga.
--
--    `iscritti` è NULL sotto la soglia. Non zero: zero direbbe «lì non c'è
--    nessuno», che è un'altra informazione e per giunta falsa.
-- ----------------------------------------------------------------------------
create or replace function public.mappa_iscritti(soglia integer default 5)
returns table (regione text, iscritti integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.regione,
    case when count(*) >= greatest(soglia, 1) then count(*)::integer else null end
  from public.profiles p
  where p.regione is not null
  group by p.regione
  order by p.regione;
$$;

comment on function public.mappa_iscritti(integer) is
  'Iscritti per regione. Sotto la soglia restituisce NULL: un conteggio di uno non è una statistica, è una persona.';

-- ----------------------------------------------------------------------------
-- 3. Il riepilogo.
--
--    `totale_visibile` somma SOLO le regioni mostrate. Il totale generale non
--    esce di proposito: con quello, le regioni nascoste si ricaverebbero per
--    differenza e la soppressione non servirebbe a niente.
-- ----------------------------------------------------------------------------
create or replace function public.riepilogo_mappa(soglia integer default 5)
returns table (
  totale_visibile   integer,
  regioni_visibili  integer,
  regioni_nascoste  integer,
  senza_regione     integer
)
language sql
stable
security definer
set search_path = public
as $$
  with per_regione as (
    select p.regione, count(*)::integer as n
    from public.profiles p
    where p.regione is not null
    group by p.regione
  )
  select
    coalesce(sum(n) filter (where n >= greatest(soglia, 1)), 0)::integer,
    count(*) filter (where n >= greatest(soglia, 1))::integer,
    count(*) filter (where n <  greatest(soglia, 1))::integer,
    (select count(*)::integer from public.profiles where regione is null);
$$;

comment on function public.riepilogo_mappa(integer) is
  'Totale delle sole regioni mostrate. Il totale generale non esce: permetterebbe di ricavare per differenza quelle nascoste.';

grant execute on function public.mappa_iscritti(integer) to authenticated;
grant execute on function public.riepilogo_mappa(integer) to authenticated;
revoke execute on function public.mappa_iscritti(integer) from anon;
revoke execute on function public.riepilogo_mappa(integer) from anon;

-- ----------------------------------------------------------------------------
-- 4. La regione resta modificabile solo dal diretto interessato.
--
--    `profiles_update` (0001) consente già di aggiornare la propria riga, e
--    `protect_profile_privileged_columns()` (0016) rimette a posto ruolo,
--    leader e vip_call_host. `regione` NON va protetta: è esattamente il tipo
--    di dato che ciascuno deve poter cambiare da sé.
-- ----------------------------------------------------------------------------
