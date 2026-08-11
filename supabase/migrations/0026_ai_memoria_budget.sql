-- ============================================================================
-- Invisionary — Migrazione 0026: memoria dell'agente e tetto di spesa.
-- Prerequisiti: 0006 (ai_conversations), 0011 (is_admin).
-- Idempotente.
--
-- ── PERCHÉ IL TETTO VIENE PRIMA DELLA MEMORIA ──
-- Oggi `ai-chat` chiama Claude Opus con `max_tokens: 8192` e ragionamento
-- adattivo, senza alcun limite. Una persona che tiene premuto invio, un ciclo
-- in un client, o semplicemente una rete entusiasta, e il conto cresce senza
-- che nessuno se ne accorga finché non arriva la fattura. Non è un rischio
-- teorico: è l'unica parte dell'app che costa denaro a ogni tocco.
--
-- Il tetto sta nel DATABASE e non nella function, per lo stesso motivo per cui
-- ci stanno le prenotazioni: due richieste che partono insieme devono trovare
-- un contatore serializzato, non due copie della stessa lettura.
--
-- ── E PERCHÉ LA MEMORIA È PRIVATA. DAVVERO PRIVATA. ──
-- `ai_memory` contiene quello che l'agente ha capito di una persona parlandole:
-- obiettivi, difficoltà, vincoli personali. Non sono dati di lavoro come i
-- clienti nel CRM — dove la visibilità del leader È il prodotto — sono appunti
-- presi da conversazioni private.
--
-- Per questo qui NON si usa `can_read_member()`: la riga la vede solo chi l'ha
-- generata. Nemmeno l'admin. È una scelta di prodotto, ed è deliberata: un
-- amministratore che legge cosa il tuo agente ha annotato su di te sta
-- leggendo il tuo diario, non un rapporto commerciale.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Il tetto, configurabile senza rilasci.
-- ----------------------------------------------------------------------------
create table if not exists public.ai_budget (
  id                boolean primary key default true check (id),  -- riga unica
  richieste_giorno  integer not null default 40 check (richieste_giorno >= 0),
  token_mese        integer not null default 300000 check (token_mese >= 0),
  updated_at        timestamptz not null default now()
);

insert into public.ai_budget (id) values (true) on conflict (id) do nothing;

comment on table public.ai_budget is
  'Tetto di spesa dell''agente, per utente. Riga unica: il check su id la impone.';
comment on column public.ai_budget.token_mese is
  'Token generati al mese per utente. Sono quelli che si pagano di più: il tetto sta lì.';

alter table public.ai_budget enable row level security;

drop policy if exists ai_budget_select on public.ai_budget;
create policy ai_budget_select on public.ai_budget
  for select using (auth.uid() is not null);
drop policy if exists ai_budget_write on public.ai_budget;
create policy ai_budget_write on public.ai_budget
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.ai_budget to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Il consumo, per utente e per giorno.
-- ----------------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  giorno     date not null default current_date,
  richieste  integer not null default 0 check (richieste >= 0),
  token_in   bigint  not null default 0 check (token_in >= 0),
  token_out  bigint  not null default 0 check (token_out >= 0),
  primary key (user_id, giorno)
);

comment on table public.ai_usage is
  'Quante richieste e quanti token ha consumato ciascuno, per giorno. Il conteggio serve al tetto, non a spiare le conversazioni: non contiene testo.';

alter table public.ai_usage enable row level security;

-- Ciascuno vede il proprio consumo; l'admin vede tutto perché è chi paga.
drop policy if exists ai_usage_select on public.ai_usage;
create policy ai_usage_select on public.ai_usage
  for select using (user_id = auth.uid() or public.is_admin());

-- Nessuna policy di scrittura: si passa dalle funzioni, altrimenti il tetto
-- si azzererebbe da solo con una update.
grant select on public.ai_usage to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Chiedere il permesso di spendere.
--
--    L'`insert … on conflict do update` prende un lock sulla riga: due
--    richieste simultanee dello stesso utente si serializzano, e la seconda
--    trova il contatore già incrementato. Un controllo applicativo «quante ne
--    ha fatte oggi?» seguito da una insert sarebbe una corsa — la stessa forma
--    già vista con le prenotazioni e col saldo dei punti.
--
--    Se il tetto è superato si solleva un errore, e l'incremento torna
--    indietro con la transazione.
-- ----------------------------------------------------------------------------
create or replace function public.consuma_richiesta_ai(p_user uuid)
returns table (richieste_oggi integer, richieste_max integer, token_mese_usati bigint, token_mese_max integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg record;
  fatte integer;
  token_mese bigint;
begin
  if p_user is null then
    raise exception 'Utente non identificato.' using errcode = '42501';
  end if;

  select richieste_giorno, token_mese into cfg from public.ai_budget where id;

  -- I token del mese si controllano PRIMA: sono la voce che pesa sul conto, e
  -- si conoscono solo a chiamata finita — quindi si guarda l'arretrato.
  select coalesce(sum(u.token_out), 0) into token_mese
  from public.ai_usage u
  where u.user_id = p_user and u.giorno >= date_trunc('month', current_date)::date;

  if cfg.token_mese > 0 and token_mese >= cfg.token_mese then
    raise exception 'Hai raggiunto il limite di utilizzo mensile dell''agente.'
      using errcode = 'P0002';
  end if;

  insert into public.ai_usage (user_id, giorno, richieste)
  values (p_user, current_date, 1)
  on conflict (user_id, giorno) do update
    set richieste = public.ai_usage.richieste + 1
  returning richieste into fatte;

  if cfg.richieste_giorno > 0 and fatte > cfg.richieste_giorno then
    raise exception 'Hai raggiunto il limite di domande di oggi.' using errcode = 'P0003';
  end if;

  return query select fatte, cfg.richieste_giorno, token_mese, cfg.token_mese;
end;
$$;

comment on function public.consuma_richiesta_ai(uuid) is
  'Incrementa il contatore e rifiuta se il tetto è superato. Il lock sulla riga serializza le richieste simultanee.';

-- ----------------------------------------------------------------------------
-- 4. Registrare quanto è costata davvero.
--    Si chiama a risposta ottenuta: i token si sanno solo dopo.
-- ----------------------------------------------------------------------------
create or replace function public.registra_token_ai(p_user uuid, p_in bigint, p_out bigint)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_usage (user_id, giorno, token_in, token_out)
  values (p_user, current_date, greatest(p_in, 0), greatest(p_out, 0))
  on conflict (user_id, giorno) do update
    set token_in  = public.ai_usage.token_in  + greatest(p_in, 0),
        token_out = public.ai_usage.token_out + greatest(p_out, 0);
$$;

-- ----------------------------------------------------------------------------
-- 5. Quanto resta, per l'interfaccia.
-- ----------------------------------------------------------------------------
create or replace function public.budget_ai()
returns table (
  richieste_oggi   integer,
  richieste_max    integer,
  token_mese_usati bigint,
  token_mese_max   integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select u.richieste from public.ai_usage u
              where u.user_id = auth.uid() and u.giorno = current_date), 0),
    (select b.richieste_giorno from public.ai_budget b where b.id),
    coalesce((select sum(u.token_out) from public.ai_usage u
              where u.user_id = auth.uid()
                and u.giorno >= date_trunc('month', current_date)::date), 0),
    (select b.token_mese from public.ai_budget b where b.id);
$$;

grant execute on function public.budget_ai() to authenticated;
revoke execute on function public.consuma_richiesta_ai(uuid) from anon, authenticated;
revoke execute on function public.registra_token_ai(uuid, bigint, bigint) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. La memoria.
--
--    `fatto` è una frase breve, in terza persona, scritta dall'agente:
--    «Vuole passare da collaboratore a leader entro l'anno».
-- ----------------------------------------------------------------------------
create table if not exists public.ai_memory (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  fatto      text not null check (length(btrim(fatto)) between 3 and 300),
  categoria  text not null default 'situazione'
               check (categoria in ('obiettivo', 'preferenza', 'situazione', 'vincolo')),
  created_at timestamptz not null default now()
);

create index if not exists ai_memory_user_idx on public.ai_memory (user_id, created_at desc);
-- Lo stesso fatto non si annota due volte.
create unique index if not exists ai_memory_unica on public.ai_memory (user_id, lower(btrim(fatto)));

comment on table public.ai_memory is
  'Quello che l''agente ricorda di una persona. PRIVATO: lo vede solo chi l''ha generato, nemmeno l''admin.';

alter table public.ai_memory enable row level security;

-- ⚠️ NIENTE can_read_member() E NIENTE is_admin(), DI PROPOSITO.
-- Questi non sono dati di lavoro: sono appunti presi da conversazioni private.
-- Un amministratore che li leggesse starebbe leggendo un diario.
drop policy if exists ai_memory_select on public.ai_memory;
create policy ai_memory_select on public.ai_memory
  for select using (user_id = auth.uid());

-- Si cancella la propria memoria quando si vuole. Non si modifica: un ricordo
-- sbagliato si toglie, non si riscrive.
drop policy if exists ai_memory_delete on public.ai_memory;
create policy ai_memory_delete on public.ai_memory
  for delete using (user_id = auth.uid());

-- Nessuna policy di insert: scrive solo la Edge Function col service_role.
-- Se scrivesse il client, chiunque potrebbe iniettare istruzioni nel prompt
-- dell'agente spacciandole per ricordi.

grant select, delete on public.ai_memory to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Un tetto anche alla memoria.
--    Senza, cresce all'infinito e finisce per occupare tutto il prompt —
--    facendo peggiorare le risposte invece di migliorarle.
-- ----------------------------------------------------------------------------
create or replace function public.ai_memory_pota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ai_memory
  where user_id = new.user_id
    and id not in (
      select id from public.ai_memory
      where user_id = new.user_id
      order by created_at desc
      limit 40
    );
  return null;
end;
$$;

drop trigger if exists ai_memory_pota_trg on public.ai_memory;
create trigger ai_memory_pota_trg
  after insert on public.ai_memory
  for each row execute function public.ai_memory_pota();
