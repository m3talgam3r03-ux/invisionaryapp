-- ============================================================================
-- Invisionary — Migrazione 0027: funnel di acquisizione contatti.
-- Prerequisiti: 0017 (clients.origine), 0018 (consensi), 0019 (normalizzazione).
-- Idempotente.
--
-- ⚠️ QUESTA È LA PRIMA PORTA PUBBLICA DELL'APP.
-- Tutto il resto sta dietro un login. Un modulo su una pagina pubblica no: lo
-- vede internet, e internet ci scrive dentro. Cambiano tre cose rispetto a
-- qualunque altra tabella:
--
-- 1. LO SPAM ARRIVA. Non «potrebbe»: un modulo pubblico senza freni raccoglie
--    robot nel giro di ore, e cento righe finte rendono il CRM inservibile —
--    che è peggio di non avere il funnel. Da qui: limite orario per funnel,
--    campo civetta, tempo minimo di compilazione.
--
-- 2. IL CONSENSO VA DIMOSTRATO, NON DICHIARATO. Non basta salvare «sì»:
--    bisogna poter mostrare COSA la persona ha letto quando l'ha dato. Il
--    testo si copia sulla riga del lead, non si referenzia: se domani si
--    corregge l'informativa del funnel, ciò che quella persona ha accettato
--    non deve cambiare. Stessa ragione della fotografia del prezzo sui premi.
--
-- 3. L'INDIRIZZO IP È UN DATO PERSONALE. Serve per limitare gli abusi, e per
--    quello basta un'impronta: si salva un hash con sale, mai l'IP in chiaro.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. I funnel.
-- ----------------------------------------------------------------------------
create table if not exists public.funnels (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique
                   check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  titolo         text not null,
  sottotitolo    text,
  /** Chi riceve i contatti: il lead nasce già suo. */
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  attivo         boolean not null default true,

  /** Il testo dell'informativa mostrato accanto alle spunte. Obbligatorio. */
  testo_consenso text not null check (length(btrim(testo_consenso)) >= 20),

  /**
   * Quali canali chiede questo funnel. Una spunta per canale, mai una sola
   * per tutti: la 0018 esiste proprio perché email, SMS, WhatsApp e telefono
   * sono decisioni separate, e una spunta che ne concede tre in blocco è il
   * consenso generico che quello schema doveva impedire.
   */
  canali         text[] not null default array['email']
                   check (
                     array_length(canali, 1) between 1 and 4
                     and canali <@ array['email', 'sms', 'whatsapp', 'telefono']
                   ),

  /** Quanti contatti accettare in un'ora. Oltre, si rifiuta. */
  max_lead_ora   integer not null default 60 check (max_lead_ora > 0),

  created_at     timestamptz not null default now()
);

create index if not exists funnels_owner_idx on public.funnels (owner_id);

comment on column public.funnels.slug is
  'Parte finale dell''indirizzo pubblico. Il check impedisce slug che diventerebbero percorsi ambigui.';
comment on column public.funnels.testo_consenso is
  'Cosa legge la persona prima di accettare. Obbligatorio: un consenso senza testo non è dimostrabile.';

alter table public.funnels enable row level security;

-- Un funnel lo gestisce chi lo possiede; l'admin vede tutto.
drop policy if exists funnels_select on public.funnels;
create policy funnels_select on public.funnels
  for select using (owner_id = auth.uid() or public.is_admin());
drop policy if exists funnels_write on public.funnels;
create policy funnels_write on public.funnels
  for all
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.funnels to authenticated;

-- ----------------------------------------------------------------------------
-- 2. I contatti arrivati.
--
--    Restano anche quando il contatto nel CRM viene poi cancellato: sono la
--    prova di cosa è stato raccolto e con quale consenso. `client_id` va a
--    null, la riga no.
-- ----------------------------------------------------------------------------
create table if not exists public.funnel_leads (
  id             uuid primary key default gen_random_uuid(),
  funnel_id      uuid not null references public.funnels (id) on delete cascade,
  nome           text,
  email          text,
  telefono       text,

  /** Copia, non riferimento: ciò che è stato accettato non cambia mai più. */
  testo_consenso text not null,
  /** I canali effettivamente spuntati. Vuoto = nessun consenso dato. */
  canali_accettati text[] not null default '{}'
                     check (canali_accettati <@ array['email', 'sms', 'whatsapp', 'telefono']),

  /** Impronta dell'IP, non l'IP: serve a contare, non a identificare. */
  ip_hash        text,
  client_id      uuid references public.clients (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists funnel_leads_funnel_idx on public.funnel_leads (funnel_id, created_at desc);
create index if not exists funnel_leads_ora_idx on public.funnel_leads (created_at);

comment on table public.funnel_leads is
  'Contatti arrivati da un funnel, con copia del consenso accettato. Restano anche se il contatto CRM viene cancellato: sono la prova.';

alter table public.funnel_leads enable row level security;

-- Li vede chi possiede il funnel, e l'admin.
drop policy if exists funnel_leads_select on public.funnel_leads;
create policy funnel_leads_select on public.funnel_leads
  for select using (
    exists (
      select 1 from public.funnels f
      where f.id = funnel_leads.funnel_id
        and (f.owner_id = auth.uid() or public.is_admin())
    )
  );

-- Nessuna policy di scrittura: scrive solo la Edge Function col service_role.
-- Il modulo è pubblico, e una insert diretta dal browser significherebbe
-- lasciare a chiunque la possibilità di scrivere nel CRM di chiunque.
grant select on public.funnel_leads to authenticated;

-- ----------------------------------------------------------------------------
-- 3. La pagina pubblica: cosa può sapere chi non ha fatto il login.
--
--    SECURITY DEFINER, ma restituisce SOLO ciò che serve a disegnare il
--    modulo. Mai `owner_id`: chi arriva sulla pagina non deve poter risalire a
--    quale persona della rete riceve i contatti.
-- ----------------------------------------------------------------------------
create or replace function public.funnel_pubblico(p_slug text)
returns table (titolo text, sottotitolo text, testo_consenso text, canali text[])
language sql
stable
security definer
set search_path = public
as $$
  select f.titolo, f.sottotitolo, f.testo_consenso, f.canali
  from public.funnels f
  where f.slug = lower(btrim(p_slug)) and f.attivo;
$$;

grant execute on function public.funnel_pubblico(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Registrare un contatto.
--
--    Tutto in una funzione perché deve succedere insieme o non succedere:
--    limite, contatto, consensi, riga del lead. Se una parte fallisce, non
--    resta un contatto senza consenso — che sarebbe la cosa peggiore.
--
--    La deduplica riusa `normalizza_email` / `normalizza_telefono` della 0019:
--    lo stesso indirizzo scritto in due modi non deve creare due contatti.
-- ----------------------------------------------------------------------------
create or replace function public.registra_lead(
  p_slug     text,
  p_nome     text,
  p_email    text,
  p_telefono text,
  /** I canali spuntati dalla persona. Uno per spunta, mai un blocco unico. */
  p_canali   text[],
  p_ip_hash  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
  arrivati integer;
  email_n text;
  tel_n text;
  contatto uuid;
  lead uuid;
  concessi text[];
begin
  select * into f from public.funnels where slug = lower(btrim(p_slug)) and attivo;
  if not found then
    raise exception 'Funnel non disponibile.' using errcode = 'P0004';
  end if;

  -- Il freno allo spam. Conta la finestra scorrevole dell'ultima ora: senza,
  -- cento righe finte rendono il CRM inservibile, che è peggio di non avere
  -- il funnel.
  select count(*) into arrivati
  from public.funnel_leads l
  where l.funnel_id = f.id and l.created_at > now() - interval '1 hour';

  if arrivati >= f.max_lead_ora then
    raise exception 'Troppe richieste per questo funnel. Riprova più tardi.'
      using errcode = 'P0005';
  end if;

  -- Serve almeno un modo per ricontattare, altrimenti non è un contatto.
  email_n := public.normalizza_email(p_email);
  tel_n   := public.normalizza_telefono(p_telefono);
  if email_n is null and tel_n is null then
    raise exception 'Servono un''email o un numero di telefono.' using errcode = 'P0006';
  end if;

  -- Se la persona c'è già fra i contatti di chi possiede il funnel, si
  -- aggiorna quella invece di crearne una seconda.
  select c.id into contatto
  from public.clients c
  where c.owner_id = f.owner_id
    and (
      (email_n is not null and c.email = email_n)
      or (tel_n is not null and c.telefono_e164 = tel_n)
    )
  limit 1;

  if contatto is null then
    insert into public.clients (owner_id, nome, email, telefono_e164, origine, stato)
    values (f.owner_id, coalesce(nullif(btrim(p_nome), ''), 'Contatto dal funnel'),
            email_n, tel_n, 'funnel', 'nuovo')
    returning id into contatto;
  end if;

  -- I consensi, UNO PER CANALE, col testo che la persona ha davvero letto.
  --
  -- Si tiene solo l'intersezione fra ciò che il funnel chiede e ciò che è
  -- stato spuntato: un canale non richiesto dal funnel non si concede nemmeno
  -- se arriva nella richiesta, altrimenti basterebbe modificare il modulo nel
  -- browser per regalarsi consensi. E si scartano i canali per cui manca il
  -- recapito: un consenso email senza email non vuol dire niente.
  concessi := array(
    select c from unnest(coalesce(p_canali, '{}')) as c
    where c = any(f.canali)
      and ((c = 'email' and email_n is not null) or (c <> 'email' and tel_n is not null))
  );

  if array_length(concessi, 1) > 0 then
    insert into public.contact_consents (client_id, canale, valore, origine, testo_informativa)
    select contatto, c, true, 'funnel', f.testo_consenso
    from unnest(concessi) as c
    on conflict (client_id, canale) do update
      set valore = true, origine = 'funnel', testo_informativa = excluded.testo_informativa;
  end if;

  insert into public.funnel_leads (
    funnel_id, nome, email, telefono, testo_consenso, canali_accettati, ip_hash, client_id
  )
  values (
    f.id, nullif(btrim(p_nome), ''), email_n, tel_n, f.testo_consenso,
    coalesce(concessi, '{}'), p_ip_hash, contatto
  )
  returning id into lead;

  return lead;
end;
$$;

comment on function public.registra_lead is
  'Registra un contatto dal funnel: limite, deduplica, consensi con testo, riga di prova. Tutto insieme o niente.';

-- Solo la Edge Function: il modulo è pubblico, e lasciarla chiamare dal
-- browser significherebbe permettere a chiunque di scrivere nel CRM altrui.
revoke execute on function public.registra_lead(text, text, text, text, text[], text)
  from anon, authenticated;
