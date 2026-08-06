-- ============================================================================
-- Invisionary — Migrazione 0022: promemoria degli appuntamenti.
-- Prerequisito: 0021_calendario_prenotazioni.sql.
-- Idempotente.
--
-- Stessa forma dei promemoria dei rinnovi (0013), per la stessa ragione: la
-- chiave primaria su (booking_id, offset_minuti) rende il doppio invio
-- impossibile per costruzione. Se il cron gira due volte, la seconda insert
-- viene ignorata — meglio di un controllo applicativo, che due esecuzioni
-- sovrapposte bucherebbero.
--
-- Qui gli scaglioni sono in MINUTI e non in giorni: un appuntamento si avvisa
-- il giorno prima e un'ora prima, non una settimana prima.
-- ============================================================================

create table if not exists public.booking_reminders (
  booking_id     uuid not null references public.bookings (id) on delete cascade,
  offset_minuti  integer not null check (offset_minuti > 0),
  sent_at        timestamptz not null default now(),
  primary key (booking_id, offset_minuti)
);

comment on table public.booking_reminders is
  'Promemoria già inviati per un appuntamento. La chiave primaria impedisce il doppio invio.';

-- Scrittura solo dalla Edge Function (service_role, che scavalca la RLS).
-- Nessuna policy di scrittura, di proposito. In lettura, solo sui propri
-- appuntamenti.
alter table public.booking_reminders enable row level security;

drop policy if exists booking_reminders_select on public.booking_reminders;
create policy booking_reminders_select on public.booking_reminders
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_reminders.booking_id
        and (b.guest_id = auth.uid() or b.host_id = auth.uid() or public.is_admin())
    )
  );

grant select on public.booking_reminders to authenticated;

-- ----------------------------------------------------------------------------
-- Se un appuntamento viene annullato, i promemoria non devono più partire.
-- Non si cancellano le righe già inviate: si smette di produrne, e la funzione
-- qui sotto filtra sullo stato.
--
-- Chi va avvisato: ENTRAMBI. Un appuntamento è un impegno reciproco, e
-- avvisare solo chi ha prenotato lascerebbe l'altro a scoprirlo da solo.
-- ----------------------------------------------------------------------------
create or replace function public.appuntamenti_da_avvisare()
returns table (
  booking_id        uuid,
  host_id           uuid,
  guest_id          uuid,
  inizio            timestamptz,
  minuti_mancanti   integer,
  offsets_coperti   integer[]
)
language sql
stable
security definer
set search_path = public
as $$
  with scaglioni as (
    -- 24 ore prima e 60 minuti prima.
    select unnest(array[1440, 60]) as off
  ),
  dovuti as (
    select b.id, b.host_id, b.guest_id, b.inizio, s.off
    from public.bookings b
    cross join scaglioni s
    where b.stato = 'confermata'
      and b.inizio > now()                                        -- non già passato
      and b.inizio - make_interval(mins => s.off) <= now()        -- è arrivato il momento
      and not exists (
        select 1 from public.booking_reminders br
        where br.booking_id = b.id and br.offset_minuti = s.off
      )
  )
  select
    d.id,
    d.host_id,
    d.guest_id,
    d.inizio,
    (extract(epoch from (d.inizio - now())) / 60)::integer,
    -- Se il cron salta un giro, si manda UN solo avviso e si registrano tutti
    -- gli scaglioni coperti, così non riemergono al giro dopo.
    array_agg(d.off order by d.off desc)
  from dovuti d
  group by d.id, d.host_id, d.guest_id, d.inizio;
$$;

comment on function public.appuntamenti_da_avvisare() is
  'Appuntamenti che meritano un promemoria adesso, con gli scaglioni da registrare. Avvisa entrambe le persone.';

revoke execute on function public.appuntamenti_da_avvisare() from anon, authenticated;
