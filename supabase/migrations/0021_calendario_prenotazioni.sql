-- ============================================================================
-- Invisionary — Migrazione 0021: disponibilità e prenotazioni.
-- Prerequisiti: 0011 (is_admin, jwt_role), 0012 (is_leader_of).
-- Idempotente.
--
-- COSA RISOLVE
-- Un collaboratore deve poter prenotare una call col proprio leader senza
-- scambi di messaggi. Il leader pubblica quando è disponibile, l'app calcola
-- gli slot liberi, il collaboratore ne prende uno.
--
-- I DUE PUNTI DOVE QUESTE COSE SI ROMPONO
--
-- 1. LA DOPPIA PRENOTAZIONE. Controllare «lo slot è libero?» e poi inserire è
--    una corsa: due persone che aprono l'app insieme prenotano lo stesso
--    orario, e nessuna delle due se ne accorge. Nessun controllo applicativo
--    lo evita, perché fra la lettura e la scrittura passa del tempo.
--    Qui lo impedisce un vincolo di esclusione (`btree_gist`): la seconda
--    scrittura viene rifiutata da Postgres, atomicamente. L'app deve
--    riconoscere l'errore 23P01 e dire «qualcuno l'ha appena preso».
--
-- 2. I FUSI ORARI. «Sono libero il martedì dalle 9 alle 12» è un'ora LOCALE,
--    e in UTC cambia due volte l'anno con l'ora legale. Per questo la
--    disponibilità si salva come `time` + fuso dell'host, mai come
--    timestamptz, e la conversione la fa Postgres con `at time zone`, che ha
--    il database dei fusi aggiornato. Le prenotazioni, invece, sono istanti
--    assoluti: quelle sono timestamptz.
-- ============================================================================

-- Serve per mettere un uuid (=) e un range (&&) nello stesso indice gist.
create extension if not exists btree_gist;

-- ----------------------------------------------------------------------------
-- 1. Il fuso di ciascuno.
--    Senza, non si sa cosa significhi «le 9» per chi pubblica la disponibilità.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists fuso text not null default 'Europe/Rome';

comment on column public.profiles.fuso is
  'Fuso IANA (es. Europe/Rome). È il significato di «le 9» quando questa persona pubblica la disponibilità.';

-- ----------------------------------------------------------------------------
-- 2. Disponibilità ricorrente, in ora locale dell'host.
--    `giorno_settimana` segue extract(dow): 0 = domenica … 6 = sabato.
-- ----------------------------------------------------------------------------
create table if not exists public.availability_rules (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null references public.profiles (id) on delete cascade,
  giorno_settimana smallint not null check (giorno_settimana between 0 and 6),
  ora_inizio       time not null,
  ora_fine         time not null,
  -- Durata di un appuntamento: la finestra viene divisa in slot di questa lunghezza.
  durata_minuti    integer not null default 30 check (durata_minuti between 5 and 480),
  attivo           boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint availability_rules_finestra_valida check (ora_fine > ora_inizio)
);

create index if not exists availability_rules_host_idx
  on public.availability_rules (host_id, giorno_settimana);

comment on table public.availability_rules is
  'Disponibilità settimanale ricorrente, in ora LOCALE dell''host. Mai timestamptz: «le 9» resta le 9 anche quando cambia l''ora legale.';

-- ----------------------------------------------------------------------------
-- 3. Eccezioni: giorni o fasce in cui la regola ricorrente non vale.
--    Ore nulle = tutto il giorno.
-- ----------------------------------------------------------------------------
create table if not exists public.availability_exceptions (
  id         uuid primary key default gen_random_uuid(),
  host_id    uuid not null references public.profiles (id) on delete cascade,
  giorno     date not null,
  ora_inizio time,
  ora_fine   time,
  motivo     text,
  created_at timestamptz not null default now(),
  constraint availability_exceptions_fascia_valida check (
    (ora_inizio is null and ora_fine is null)
    or (ora_inizio is not null and ora_fine is not null and ora_fine > ora_inizio)
  )
);

create index if not exists availability_exceptions_host_idx
  on public.availability_exceptions (host_id, giorno);

comment on table public.availability_exceptions is
  'Blocchi puntuali (ferie, impegni). Ore nulle = giornata intera. Non aggiunge disponibilità: la toglie.';

-- ----------------------------------------------------------------------------
-- 4. Le prenotazioni.
--    `durante` è generata: è la colonna su cui lavora il vincolo di esclusione.
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  host_id      uuid not null references public.profiles (id) on delete cascade,
  guest_id     uuid not null references public.profiles (id) on delete cascade,
  inizio       timestamptz not null,
  fine         timestamptz not null,
  durante      tstzrange generated always as (tstzrange(inizio, fine, '[)')) stored,
  stato        text not null default 'confermata' check (stato in ('confermata', 'annullata')),
  titolo       text,
  note         text,
  annullata_da uuid references public.profiles (id) on delete set null,
  annullata_il timestamptz,
  created_at   timestamptz not null default now(),
  constraint bookings_durata_valida check (fine > inizio),
  constraint bookings_non_con_se_stessi check (host_id <> guest_id)
);

create index if not exists bookings_host_idx on public.bookings (host_id, inizio);
create index if not exists bookings_guest_idx on public.bookings (guest_id, inizio);

comment on column public.bookings.durante is
  'Intervallo [inizio, fine). Generata perché è ciò su cui il vincolo di esclusione può costruire un indice.';

-- IL VINCOLO. Due prenotazioni confermate non possono sovrapporsi sullo stesso
-- host. Il `where` è essenziale: le annullate devono poter restare in tabella
-- sovrapposte alla prenotazione che le ha sostituite, altrimenti annullare e
-- riprenotare lo stesso orario sarebbe impossibile.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_host_niente_sovrapposizioni'
  ) then
    alter table public.bookings
      add constraint bookings_host_niente_sovrapposizioni
      exclude using gist (host_id with =, durante with &&)
      where (stato = 'confermata');
  end if;
end $$;

-- E nemmeno l'ospite può essere in due posti insieme.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_ospite_niente_sovrapposizioni'
  ) then
    alter table public.bookings
      add constraint bookings_ospite_niente_sovrapposizioni
      exclude using gist (guest_id with =, durante with &&)
      where (stato = 'confermata');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Con chi si può prenotare.
--    Il proprio leader, l'amministrazione, i propri collaboratori. Non
--    chiunque: l'agenda di una persona non è pubblica.
-- ----------------------------------------------------------------------------
create or replace function public.puo_prenotare_con(p_host uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles io, public.profiles h
    where io.id = auth.uid()
      and h.id = p_host
      and (
        h.id = io.id            -- la propria agenda
        or io.role = 'admin'    -- l'admin vede tutte
        or h.role = 'admin'     -- con l'amministrazione può chiunque
        or h.id = io.leader_id  -- il proprio leader
        or h.leader_id = io.id  -- un proprio collaboratore
      )
  );
$$;

comment on function public.puo_prenotare_con(uuid) is
  'Vero se chi chiama può vedere la disponibilità di p_host e prenotarci. L''agenda non è pubblica.';

-- ----------------------------------------------------------------------------
-- 6. Gli slot liberi.
--
--    SECURITY DEFINER per un motivo preciso: per sapere cosa è libero bisogna
--    leggere le prenotazioni dell'host, che l'ospite NON deve poter vedere.
--    La funzione restituisce solo gli slot LIBERI — mai quelli occupati, e mai
--    con chi. «9:00 occupato (Marco Rossi)» direbbe a un collaboratore con chi
--    parla il suo leader.
--
--    L'ora legale: `at time zone` risolve l'ora locale col database dei fusi.
--    Nell'ora che il cambio fa sparire, Postgres sposta in avanti; in quella
--    che si ripete sceglie la prima occorrenza. In entrambi i casi il risultato
--    è un istante assoluto ben definito, quindi il vincolo di esclusione
--    continua a proteggere dalle sovrapposizioni.
-- ----------------------------------------------------------------------------
create or replace function public.slot_liberi(p_host uuid, p_da date, p_a date)
returns table (inizio timestamptz, fine timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with consentito as (
    select public.puo_prenotare_con(p_host) as ok
  ),
  host as (
    select coalesce(nullif(fuso, ''), 'Europe/Rome') as tz
    from public.profiles where id = p_host
  ),
  giorni as (
    select g::date as giorno
    from generate_series(p_da, least(p_a, p_da + 90), interval '1 day') g
  ),
  candidati as (
    select
      ((giorni.giorno + s.ora) at time zone host.tz) as inizio,
      ((giorni.giorno + s.ora) at time zone host.tz)
        + make_interval(mins => r.durata_minuti) as fine
    from giorni
    cross join host
    join public.availability_rules r
      on r.host_id = p_host
     and r.attivo
     and r.giorno_settimana = extract(dow from giorni.giorno)::smallint
    -- generate_series non lavora sui `time`: si generano i minuti di scarto.
    cross join lateral (
      select r.ora_inizio + make_interval(mins => scarto) as ora
      from generate_series(
        0,
        (extract(epoch from (r.ora_fine - r.ora_inizio)) / 60)::int - r.durata_minuti,
        r.durata_minuti
      ) as scarto
    ) s
  )
  select c.inizio, c.fine
  from candidati c
  cross join host
  where (select ok from consentito)
    and c.inizio > now()
    and not exists (
      select 1
      from public.availability_exceptions e
      where e.host_id = p_host
        and e.giorno = (c.inizio at time zone host.tz)::date
        and (
          e.ora_inizio is null
          or tstzrange(
               ((e.giorno + e.ora_inizio) at time zone host.tz),
               ((e.giorno + e.ora_fine) at time zone host.tz),
               '[)'
             ) && tstzrange(c.inizio, c.fine, '[)')
        )
    )
    and not exists (
      select 1
      from public.bookings b
      where b.host_id = p_host
        and b.stato = 'confermata'
        and b.durante && tstzrange(c.inizio, c.fine, '[)')
    )
  order by c.inizio;
$$;

comment on function public.slot_liberi(uuid, date, date) is
  'Slot liberi di p_host. Solo i liberi, mai gli occupati: l''agenda altrui non si mostra. Finestra massima 90 giorni.';

grant execute on function public.puo_prenotare_con(uuid) to authenticated;
grant execute on function public.slot_liberi(uuid, date, date) to authenticated;
revoke execute on function public.slot_liberi(uuid, date, date) from anon;

-- ----------------------------------------------------------------------------
-- 7. Una prenotazione deve cadere su uno slot pubblicato.
--
--    Il vincolo di esclusione impedisce le sovrapposizioni ma non impedisce di
--    inserire un orario qualsiasi: senza questo controllo si potrebbe prenotare
--    alle 3 di notte scrivendo direttamente all'API.
--
--    Resta una verifica preventiva, quindi teoricamente in corsa con un'altra
--    scrittura — ed è giusto così: la corsa la chiude il vincolo di esclusione,
--    che è l'unica difesa atomica. Questo controlla la legittimità dello slot,
--    quello controlla che sia ancora libero.
-- ----------------------------------------------------------------------------
create or replace function public.bookings_verifica_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
  giorno_locale date;
begin
  if new.stato <> 'confermata' then
    return new;
  end if;

  select coalesce(nullif(p.fuso, ''), 'Europe/Rome') into tz
  from public.profiles p where p.id = new.host_id;

  giorno_locale := (new.inizio at time zone tz)::date;

  if not exists (
    -- ±1 giorno: uno slot serale può cadere nella giornata precedente o
    -- successiva a seconda del fuso di chi guarda.
    select 1 from public.slot_liberi(new.host_id, giorno_locale - 1, giorno_locale + 1) s
    where s.inizio = new.inizio and s.fine = new.fine
  ) then
    raise exception 'Questo orario non è fra quelli disponibili.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_verifica_slot_trg on public.bookings;
create trigger bookings_verifica_slot_trg
  before insert on public.bookings
  for each row execute function public.bookings_verifica_slot();

-- Annullare: si registra chi e quando, senza cancellare la riga.
create or replace function public.bookings_traccia_annullamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stato = 'annullata' and old.stato <> 'annullata' then
    new.annullata_da := auth.uid();
    new.annullata_il := now();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_traccia_annullamento_trg on public.bookings;
create trigger bookings_traccia_annullamento_trg
  before update on public.bookings
  for each row execute function public.bookings_traccia_annullamento();

-- ----------------------------------------------------------------------------
-- 8. RLS
-- ----------------------------------------------------------------------------
alter table public.availability_rules      enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings                enable row level security;

-- Disponibilità: la legge chi ci può prenotare; la scrive solo l'host (o l'admin).
drop policy if exists availability_rules_select on public.availability_rules;
create policy availability_rules_select on public.availability_rules
  for select using (public.puo_prenotare_con(host_id));

drop policy if exists availability_rules_write on public.availability_rules;
create policy availability_rules_write on public.availability_rules
  for all
  using (host_id = auth.uid() or public.is_admin())
  with check (host_id = auth.uid() or public.is_admin());

drop policy if exists availability_exceptions_select on public.availability_exceptions;
create policy availability_exceptions_select on public.availability_exceptions
  for select using (public.puo_prenotare_con(host_id));

drop policy if exists availability_exceptions_write on public.availability_exceptions;
create policy availability_exceptions_write on public.availability_exceptions
  for all
  using (host_id = auth.uid() or public.is_admin())
  with check (host_id = auth.uid() or public.is_admin());

-- Prenotazioni: le vedono i due interessati, e l'admin.
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select using (
    guest_id = auth.uid() or host_id = auth.uid() or public.is_admin()
  );

-- Si prenota per sé stessi, e solo con chi è consentito.
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings
  for insert with check (
    guest_id = auth.uid()
    and stato = 'confermata'
    and public.puo_prenotare_con(host_id)
  );

-- Annullare può farlo chiunque dei due. Gli orari non si modificano: si
-- annulla e si riprenota, così resta traccia di cosa è successo.
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update
  using (guest_id = auth.uid() or host_id = auth.uid() or public.is_admin())
  with check (guest_id = auth.uid() or host_id = auth.uid() or public.is_admin());

-- Nessuna policy di delete: la storia degli appuntamenti non si cancella.

grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_exceptions to authenticated;
grant select, insert, update on public.bookings to authenticated;

-- ----------------------------------------------------------------------------
-- 9. Gli orari non si modificano dopo l'inserimento.
--    Senza questo, un update potrebbe spostare una prenotazione fuori dagli
--    slot pubblicati aggirando il trigger, che agisce solo in insert.
-- ----------------------------------------------------------------------------
create or replace function public.bookings_orari_immutabili()
returns trigger
language plpgsql
as $$
begin
  if new.inizio <> old.inizio or new.fine <> old.fine or new.host_id <> old.host_id then
    raise exception 'Gli orari di una prenotazione non si modificano: annulla e riprenota.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_orari_immutabili_trg on public.bookings;
create trigger bookings_orari_immutabili_trg
  before update on public.bookings
  for each row execute function public.bookings_orari_immutabili();
