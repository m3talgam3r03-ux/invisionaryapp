-- ============================================================================
-- Annulla la migrazione 0021 (disponibilità e prenotazioni).
--
-- ⚠️ Cancella prenotazioni e disponibilità. Gli appuntamenti presi non sono
-- recuperabili: esportali prima se servono.
--
-- `btree_gist` non si rimuove: potrebbe servire ad altro, e lasciarla installata
-- non costa nulla.
-- ============================================================================

drop trigger if exists bookings_orari_immutabili_trg on public.bookings;
drop trigger if exists bookings_traccia_annullamento_trg on public.bookings;
drop trigger if exists bookings_verifica_slot_trg on public.bookings;

drop function if exists public.bookings_orari_immutabili();
drop function if exists public.bookings_traccia_annullamento();
drop function if exists public.bookings_verifica_slot();
drop function if exists public.slot_liberi(uuid, date, date);
drop function if exists public.puo_prenotare_con(uuid);

drop table if exists public.bookings;
drop table if exists public.availability_exceptions;
drop table if exists public.availability_rules;

alter table public.profiles drop column if exists fuso;
