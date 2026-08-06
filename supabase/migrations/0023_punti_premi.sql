-- ============================================================================
-- Invisionary — Migrazione 0023: punti premio e catalogo dei riscatti.
-- Prerequisiti: 0011 (is_admin), 0015 (mv_rank_metriche).
-- Idempotente.
--
-- ⚠️ I PUNTI PREMIO NON SONO I PUNTI DEL RANK. Sono due cose diverse e devono
-- restare separate.
--
--   Punti rank    → un LIVELLO. Si ricalcolano dalle metriche, non si spendono.
--                   Sono la fotografia di quanto hai fatto.
--   Punti premio  → una VALUTA. Si accumulano, si spendono, il saldo scende.
--
-- Confonderle sarebbe un errore serio in due modi. Primo: chi riscatta un
-- premio vedrebbe scendere il proprio rank, cioè perderebbe un traguardo già
-- raggiunto per aver ritirato un regalo. Secondo: i punti rank sono DERIVATI da
-- una vista materializzata — non esistono come riga da decrementare, e il primo
-- ricalcolo cancellerebbe qualunque spesa.
--
-- Da qui la struttura: un registro in sola aggiunta (`points_ledger`) come
-- verità, e un saldo (`points_balance`) come contatore protetto da un CHECK.
-- Il CHECK non è ridondante: è ciò che rende impossibile spendere punti che
-- non si hanno anche quando due richieste arrivano insieme.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Il registro. Solo aggiunte: una riga sbagliata si compensa con una riga
--    opposta, non si cancella. È l'unico modo per poter spiegare un saldo.
-- ----------------------------------------------------------------------------
create table if not exists public.points_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  delta       numeric not null check (delta <> 0),
  origine     text not null check (origine in ('maturazione', 'bonus', 'riscatto', 'rimborso')),
  motivo      text,
  /** Il riscatto a cui la riga si riferisce, quando ce n'è uno. */
  riferimento uuid,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists points_ledger_user_idx
  on public.points_ledger (user_id, created_at desc);

comment on table public.points_ledger is
  'Registro dei punti premio, in sola aggiunta. Un errore si compensa con una riga opposta, non si cancella.';

-- ----------------------------------------------------------------------------
-- 2. Il saldo.
--
--    Il CHECK è la difesa vera: due riscatti simultanei non possono entrambi
--    passare, perché l'update prende un lock sulla riga e il secondo trova il
--    saldo già ridotto. Un controllo applicativo «ha abbastanza punti?» seguito
--    da un insert sarebbe una corsa, esattamente come per le prenotazioni.
-- ----------------------------------------------------------------------------
create table if not exists public.points_balance (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  saldo      numeric not null default 0 check (saldo >= 0),
  updated_at timestamptz not null default now()
);

comment on column public.points_balance.saldo is
  'Somma del registro. Il CHECK >= 0 è ciò che impedisce di spendere punti che non ci sono, anche in concorrenza.';

create or replace function public.points_applica_al_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.points_balance (user_id, saldo, updated_at)
  values (new.user_id, new.delta, now())
  on conflict (user_id) do update
    set saldo = public.points_balance.saldo + excluded.saldo,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists points_applica_al_saldo_trg on public.points_ledger;
create trigger points_applica_al_saldo_trg
  after insert on public.points_ledger
  for each row execute function public.points_applica_al_saldo();

-- ----------------------------------------------------------------------------
-- 3. Quanto vale ogni metrica in punti premio.
--
--    Tabella separata da `rank_rules` di proposito: legarle significherebbe
--    che ritoccare un peso del rank cambia anche il prezzo dei premi. Sono due
--    economie diverse e devono poter divergere.
-- ----------------------------------------------------------------------------
create table if not exists public.points_rules (
  metric          text primary key check (metric in (
                    'lezioni_completate', 'clienti_acquisiti', 'clienti_attivi', 'rinnovi_attivi')),
  punti_per_unita numeric not null check (punti_per_unita >= 0),
  attivo          boolean not null default true
);

insert into public.points_rules (metric, punti_per_unita)
values
  ('lezioni_completate', 10),
  ('clienti_acquisiti', 25)
on conflict (metric) do nothing;

-- Quanto di ciascuna metrica è GIÀ stato convertito in punti. È ciò che rende
-- la maturazione ripetibile senza accreditare due volte.
create table if not exists public.points_accrual (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  metric    text not null,
  accreditato numeric not null default 0 check (accreditato >= 0),
  primary key (user_id, metric)
);

comment on table public.points_accrual is
  'Quante unità di ogni metrica sono già diventate punti. Rende la maturazione idempotente.';

-- ----------------------------------------------------------------------------
-- 4. Maturazione: accredita la differenza fra quanto si è fatto e quanto è già
--    stato pagato.
--
--    `greatest(0, ...)` non è una precauzione oziosa: se un cliente viene
--    cancellato la metrica scende, e senza quel vincolo la funzione toglierebbe
--    punti già guadagnati. **I punti maturati non si riprendono**: sono stati
--    guadagnati quando il lavoro è stato fatto.
-- ----------------------------------------------------------------------------
create or replace function public.matura_punti(u uuid default auth.uid())
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  totale numeric := 0;
  r record;
  attuale numeric;
  gia numeric;
  nuovi numeric;
begin
  if u is null then
    raise exception 'Utente non indicato.';
  end if;

  for r in select metric, punti_per_unita from public.points_rules where attivo loop
    select case r.metric
             when 'lezioni_completate' then m.lezioni_completate_totale
             when 'clienti_acquisiti'  then m.clienti_acquisiti_totale
             when 'clienti_attivi'     then m.clienti_attivi_totale
             when 'rinnovi_attivi'     then m.rinnovi_attivi_totale
           end
      into attuale
      from public.mv_rank_metriche m where m.user_id = u;

    if attuale is null then continue; end if;

    select coalesce(a.accreditato, 0) into gia
      from public.points_accrual a
      where a.user_id = u and a.metric = r.metric;
    gia := coalesce(gia, 0);

    nuovi := greatest(0, attuale - gia);
    if nuovi > 0 and r.punti_per_unita > 0 then
      insert into public.points_ledger (user_id, delta, origine, motivo)
      values (u, nuovi * r.punti_per_unita, 'maturazione', r.metric);
      totale := totale + nuovi * r.punti_per_unita;
    end if;

    -- Si registra il massimo raggiunto anche quando la regola vale zero punti,
    -- così alzandone il valore non si paga l'arretrato. Una regola messa a
    -- `attivo = false` invece esce dal ciclo: riattivandola l'arretrato viene
    -- pagato, ed è voluto — il lavoro era stato fatto comunque.
    if nuovi > 0 then
      insert into public.points_accrual (user_id, metric, accreditato)
      values (u, r.metric, attuale)
      on conflict (user_id, metric) do update
        set accreditato = greatest(public.points_accrual.accreditato, excluded.accreditato);
    end if;
  end loop;

  return totale;
end;
$$;

comment on function public.matura_punti(uuid) is
  'Accredita i punti maturati e non ancora pagati. Ripetibile: eseguirla due volte non accredita nulla la seconda.';

-- ----------------------------------------------------------------------------
-- 5. Il catalogo.
-- ----------------------------------------------------------------------------
create table if not exists public.reward_catalog (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  descrizione  text,
  costo_punti  numeric not null check (costo_punti > 0),
  /** null = senza limite. Un numero = pezzi rimasti. */
  disponibili  integer check (disponibili is null or disponibili >= 0),
  attivo       boolean not null default true,
  ordine       integer not null default 0,
  created_at   timestamptz not null default now()
);

comment on column public.reward_catalog.disponibili is
  'Pezzi rimasti; null = senza limite. Il CHECK >= 0 impedisce di riscattare un premio esaurito in concorrenza.';

-- ----------------------------------------------------------------------------
-- 6. I riscatti.
--
--    `costo_punti` è una FOTOGRAFIA del prezzo al momento del riscatto: se
--    domani l'admin ritocca il catalogo, chi ha già speso non deve vedersi
--    cambiare l'importo pagato.
-- ----------------------------------------------------------------------------
create table if not exists public.reward_redemptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  reward_id   uuid not null references public.reward_catalog (id) on delete restrict,
  costo_punti numeric not null check (costo_punti > 0),
  stato       text not null default 'richiesta'
                check (stato in ('richiesta', 'approvata', 'consegnata', 'rifiutata')),
  note        text,
  decisa_da   uuid references public.profiles (id) on delete set null,
  decisa_il   timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists reward_redemptions_user_idx
  on public.reward_redemptions (user_id, created_at desc);
create index if not exists reward_redemptions_stato_idx
  on public.reward_redemptions (stato, created_at);

-- ----------------------------------------------------------------------------
-- 7. Riscattare.
--
--    Tutto in una transazione: si toglie un pezzo dal catalogo, si scrive la
--    riga negativa nel registro (che il trigger applica al saldo, e il CHECK
--    rifiuta se i punti non bastano) e si crea la richiesta.
--    Se una delle tre fallisce, non succede nulla.
-- ----------------------------------------------------------------------------
create or replace function public.riscatta_premio(p_reward uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  io uuid := auth.uid();
  costo numeric;
  rimasti integer;
  id_riscatto uuid;
begin
  if io is null then
    raise exception 'Sessione non valida.';
  end if;

  -- Il lock sulla riga del premio serializza i riscatti dello stesso oggetto:
  -- da qui in poi leggere e scrivere `disponibili` è al riparo dalle corse.
  select costo_punti, disponibili into costo, rimasti
  from public.reward_catalog
  where id = p_reward and attivo
  for update;

  if not found then
    raise exception 'Premio non disponibile.' using errcode = 'check_violation';
  end if;

  if rimasti is not null then
    if rimasti <= 0 then
      raise exception 'Premio esaurito.' using errcode = 'check_violation';
    end if;
    update public.reward_catalog set disponibili = disponibili - 1 where id = p_reward;
  end if;

  insert into public.reward_redemptions (user_id, reward_id, costo_punti)
  values (io, p_reward, costo)
  returning id into id_riscatto;

  -- Se il saldo non basta, il CHECK su points_balance rifiuta qui e l'intera
  -- transazione torna indietro: nessun punto speso, nessun pezzo sottratto.
  insert into public.points_ledger (user_id, delta, origine, motivo, riferimento)
  values (io, -costo, 'riscatto', 'Riscatto premio', id_riscatto);

  return id_riscatto;
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. Decidere su un riscatto.
--
--    Il rifiuto RESTITUISCE i punti con una riga opposta, e rimette il pezzo a
--    catalogo. Non si cancella la riga originale: un registro che si può
--    riscrivere non spiega più niente.
-- ----------------------------------------------------------------------------
create or replace function public.decidi_riscatto(p_id uuid, p_stato text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if not public.is_admin() then
    raise exception 'Solo un amministratore decide sui riscatti.' using errcode = '42501';
  end if;
  if p_stato not in ('approvata', 'consegnata', 'rifiutata') then
    raise exception 'Stato non valido.' using errcode = 'check_violation';
  end if;

  select * into r from public.reward_redemptions where id = p_id for update;
  if not found then
    raise exception 'Riscatto inesistente.';
  end if;
  if r.stato = 'rifiutata' then
    raise exception 'Un riscatto rifiutato non si riapre: se ne fa uno nuovo.'
      using errcode = 'check_violation';
  end if;

  if p_stato = 'rifiutata' then
    insert into public.points_ledger (user_id, delta, origine, motivo, riferimento, created_by)
    values (r.user_id, r.costo_punti, 'rimborso', 'Riscatto rifiutato', r.id, auth.uid());

    update public.reward_catalog
    set disponibili = disponibili + 1
    where id = r.reward_id and disponibili is not null;
  end if;

  update public.reward_redemptions
  set stato = p_stato, note = coalesce(p_note, note), decisa_da = auth.uid(), decisa_il = now()
  where id = p_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. Bonus manuale — SOLO ADMIN.
--
--    Non i leader, di proposito: chi può creare punti dal nulla per la propria
--    squadra può gonfiarne i risultati. È una scelta di prodotto, non una
--    limitazione tecnica, e va rivista consapevolmente se un giorno servisse.
-- ----------------------------------------------------------------------------
create or replace function public.assegna_bonus(p_user uuid, p_punti numeric, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un amministratore assegna bonus.' using errcode = '42501';
  end if;
  if p_punti = 0 then
    raise exception 'Un bonus da zero punti non è un bonus.' using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Il motivo è obbligatorio: un punto senza spiegazione non si può contestare.'
      using errcode = 'check_violation';
  end if;

  insert into public.points_ledger (user_id, delta, origine, motivo, created_by)
  values (p_user, p_punti, 'bonus', p_motivo, auth.uid());
end;
$$;

-- ----------------------------------------------------------------------------
-- 10. RLS
-- ----------------------------------------------------------------------------
alter table public.points_ledger       enable row level security;
alter table public.points_balance      enable row level security;
alter table public.points_accrual      enable row level security;
alter table public.points_rules        enable row level security;
alter table public.reward_catalog      enable row level security;
alter table public.reward_redemptions  enable row level security;

-- Registro e saldo: si leggono i propri, e quelli di chi si può già vedere.
drop policy if exists points_ledger_select on public.points_ledger;
create policy points_ledger_select on public.points_ledger
  for select using (public.can_read_member(user_id));

drop policy if exists points_balance_select on public.points_balance;
create policy points_balance_select on public.points_balance
  for select using (public.can_read_member(user_id));

drop policy if exists points_accrual_select on public.points_accrual;
create policy points_accrual_select on public.points_accrual
  for select using (public.can_read_member(user_id));

-- Nessuna policy di scrittura su registro, saldo e maturato: si scrive solo
-- passando dalle funzioni, che decidono. Una insert diretta significherebbe
-- potersi regalare punti.

drop policy if exists points_rules_select on public.points_rules;
create policy points_rules_select on public.points_rules
  for select using (auth.uid() is not null);
drop policy if exists points_rules_write on public.points_rules;
create policy points_rules_write on public.points_rules
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists reward_catalog_select on public.reward_catalog;
create policy reward_catalog_select on public.reward_catalog
  for select using (auth.uid() is not null);
drop policy if exists reward_catalog_write on public.reward_catalog;
create policy reward_catalog_write on public.reward_catalog
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists reward_redemptions_select on public.reward_redemptions;
create policy reward_redemptions_select on public.reward_redemptions
  for select using (public.can_read_member(user_id));

-- Nessuna insert diretta: si passa da riscatta_premio(), che toglie i punti.
-- Nessuna update diretta: si passa da decidi_riscatto(), che verifica il ruolo.

grant select on public.points_ledger, public.points_balance, public.points_accrual to authenticated;
grant select on public.points_rules, public.reward_catalog, public.reward_redemptions to authenticated;
grant insert, update, delete on public.points_rules, public.reward_catalog to authenticated;

grant execute on function public.matura_punti(uuid) to authenticated;
grant execute on function public.riscatta_premio(uuid) to authenticated;
grant execute on function public.decidi_riscatto(uuid, text, text) to authenticated;
grant execute on function public.assegna_bonus(uuid, numeric, text) to authenticated;
revoke execute on function public.matura_punti(uuid) from anon;
revoke execute on function public.riscatta_premio(uuid) from anon;
revoke execute on function public.decidi_riscatto(uuid, text, text) from anon;
revoke execute on function public.assegna_bonus(uuid, numeric, text) from anon;
