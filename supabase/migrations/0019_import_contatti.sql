-- ============================================================================
-- Invisionary — Migrazione 0019: importazioni tracciate e contatti deduplicabili.
-- Prerequisito: 0017_crm_stati.sql, 0018_consensi_gdpr.sql.
-- Idempotente.
--
-- Terzo pezzo di M6. Gli invii (M6d) seguono.
--
-- DUE COSE, ENTRAMBE NECESSARIE PER LA DEDUPLICA E PER LA LEGGE
--
-- 1. Email e telefono finora stavano in un unico campo libero `contatto`.
--    Deduplicare su un campo libero non funziona: «+39 340 123 4567»,
--    «3401234567» e «0039 340 1234567» sono la stessa persona ma tre stringhe
--    diverse. Servono colonne separate e normalizzate.
--
-- 2. Chi importa una lista deve dichiarare DA DOVE arrivano quei dati e con
--    quale base giuridica li tratta. Non è burocrazia: è la sola cosa che si
--    può esibire se qualcuno chiede perché quei contatti sono nel sistema.
--    La dichiarazione vive in `import_batches` e ogni contatto ci resta legato.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Le importazioni, con la loro dichiarazione.
-- ----------------------------------------------------------------------------
create table if not exists public.import_batches (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nome_file        text,
  /** Da dove arrivano i dati: «evento del 12/03», «rubrica personale», … */
  origine_dati     text not null check (length(trim(origine_dati)) > 0),
  /** Su quale base si trattano: consenso, contratto, legittimo interesse, … */
  base_giuridica   text not null check (base_giuridica in
                     ('consenso', 'contratto', 'obbligo_legale', 'legittimo_interesse')),
  righe_totali     integer not null default 0,
  righe_importate  integer not null default 0,
  righe_duplicate  integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists import_batches_owner_idx on public.import_batches (owner_id, created_at desc);

comment on table public.import_batches is
  'Ogni importazione con la sua dichiarazione di origine e base giuridica. È la risposta a «perché avete questi dati».';

alter table public.import_batches enable row level security;

drop policy if exists import_batches_select on public.import_batches;
create policy import_batches_select on public.import_batches
  for select using (public.can_read_member(owner_id));

drop policy if exists import_batches_insert on public.import_batches;
create policy import_batches_insert on public.import_batches
  for insert with check (owner_id = auth.uid() or public.is_admin());

grant select, insert on public.import_batches to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Email e telefono separati e normalizzati.
--    `contatto` resta com'è: è quello che l'utente ha scritto, e va conservato.
--    Le due colonne nuove sono la forma confrontabile, non la sostituzione.
-- ----------------------------------------------------------------------------
alter table public.clients
  add column if not exists email text,
  add column if not exists telefono_e164 text,
  add column if not exists import_batch_id uuid references public.import_batches (id) on delete set null;

comment on column public.clients.email is
  'Email in minuscolo, per il confronto. Il testo originale resta in `contatto`.';
comment on column public.clients.telefono_e164 is
  'Telefono in formato E.164 (+39…), per il confronto. Il testo originale resta in `contatto`.';

-- Indici per la ricerca dei duplicati: non unici di proposito. Due persone
-- possono legittimamente condividere un numero di casa, e un vincolo rigido
-- farebbe fallire l'intera importazione invece di segnalare la riga.
create index if not exists clients_email_idx
  on public.clients (owner_id, email) where email is not null;
create index if not exists clients_telefono_idx
  on public.clients (owner_id, telefono_e164) where telefono_e164 is not null;

-- ----------------------------------------------------------------------------
-- 3. Normalizzazione lato database, così vale anche per chi scrive via API.
--    Non sostituisce quella dell'app: la conferma. Se le due divergessero,
--    quella giusta è questa.
-- ----------------------------------------------------------------------------
create or replace function public.normalizza_email(v text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(v)), '');
$$;

/**
 * Telefono in E.164 con prefisso italiano di default.
 * Rispecchia normalizzaTelefono() di src/lib/normalize.ts.
 *
 * ⚠️ Lo zero iniziale NON si toglie per l'Italia. In molti paesi è un prefisso
 * interurbano da scartare nella forma internazionale, ma in Italia fa parte del
 * numero: un fisso di Milano è +39 02 1234567, non +39 2 1234567. Toglierlo
 * renderebbe irraggiungibile ogni numero fisso, e senza dare errore.
 */
create or replace function public.normalizza_telefono(v text, prefisso text default '+39')
returns text
language plpgsql
immutable
as $$
declare
  pulito text;
  nazionale text;
begin
  if v is null or trim(v) = '' then
    return null;
  end if;

  pulito := regexp_replace(v, '[^0-9+]', '', 'g');
  if pulito = '' then
    return null;
  end if;

  if pulito like '00%' then
    pulito := '+' || substring(pulito from 3);
  end if;

  if pulito like '+%' then
    return case when length(pulito) between 8 and 16 then pulito else null end;
  end if;

  -- Un «+» in mezzo al numero rende il valore inaffidabile.
  if position('+' in pulito) > 0 then
    return null;
  end if;

  -- Fuori dall'Italia lo zero iniziale è un prefisso interurbano e va tolto.
  nazionale := case when prefisso = '+39' then pulito else regexp_replace(pulito, '^0+', '') end;

  if length(nazionale) between 6 and 13 then
    return prefisso || nazionale;
  end if;

  return null;
end;
$$;

-- Le colonne di confronto si riempiono da sole: chi scrive non deve ricordarsi
-- di normalizzare, e un dato scritto male non diventa un duplicato invisibile.
create or replace function public.clients_normalizza()
returns trigger
language plpgsql
as $$
begin
  new.email := public.normalizza_email(new.email);
  new.telefono_e164 := public.normalizza_telefono(new.telefono_e164);
  return new;
end;
$$;

drop trigger if exists clients_normalizza_trigger on public.clients;
create trigger clients_normalizza_trigger
  before insert or update of email, telefono_e164 on public.clients
  for each row execute function public.clients_normalizza();

-- ----------------------------------------------------------------------------
-- 4. Riempimento iniziale dal campo libero esistente.
--    Un'email si riconosce dalla chiocciola; il resto, se contiene abbastanza
--    cifre, è un telefono. Nel dubbio si lascia vuoto: meglio un confronto in
--    meno che un dato inventato.
-- ----------------------------------------------------------------------------
update public.clients
set email = public.normalizza_email(contatto)
where email is null and contatto like '%@%';

update public.clients
set telefono_e164 = public.normalizza_telefono(contatto)
where telefono_e164 is null
  and contatto is not null
  and contatto not like '%@%';

-- ----------------------------------------------------------------------------
-- 5. Chi è già in lista: la ricerca dei duplicati per un'importazione.
--    Restituisce le corrispondenze fra i valori proposti e i contatti già
--    presenti DELLO STESSO proprietario — non si deduplica contro la rubrica
--    di un altro.
-- ----------------------------------------------------------------------------
create or replace function public.trova_duplicati(emails text[], telefoni text[])
returns table (client_id uuid, nome text, email text, telefono_e164 text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.nome, c.email, c.telefono_e164
  from public.clients c
  where c.owner_id = auth.uid()
    and (
      (c.email is not null and c.email = any (
        select public.normalizza_email(e) from unnest(coalesce(emails, '{}')) as e))
      or
      (c.telefono_e164 is not null and c.telefono_e164 = any (
        select public.normalizza_telefono(t) from unnest(coalesce(telefoni, '{}')) as t))
    );
$$;

grant execute on function public.trova_duplicati(text[], text[]) to authenticated;
revoke execute on function public.trova_duplicati(text[], text[]) from anon;

-- ----------------------------------------------------------------------------
-- 6. Export con i consensi inclusi.
--    Esportare i contatti senza i loro consensi produrrebbe una lista che non
--    si può usare: chi la riceve non sa chi è contattabile e su cosa.
-- ----------------------------------------------------------------------------
create or replace function public.export_contatti()
returns table (
  nome              text,
  email             text,
  telefono          text,
  prodotto          text,
  stato             text,
  origine           text,
  ultimo_contatto   date,
  consenso_email    boolean,
  consenso_sms      boolean,
  consenso_whatsapp boolean,
  consenso_telefono boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.nome,
    c.email,
    c.telefono_e164,
    c.prodotto,
    c.stato,
    c.origine,
    c.ultimo_contatto_at::date,
    (select k.valore from public.contact_consents k where k.client_id = c.id and k.canale = 'email'),
    (select k.valore from public.contact_consents k where k.client_id = c.id and k.canale = 'sms'),
    (select k.valore from public.contact_consents k where k.client_id = c.id and k.canale = 'whatsapp'),
    (select k.valore from public.contact_consents k where k.client_id = c.id and k.canale = 'telefono')
  from public.clients c
  where public.can_read_member(c.owner_id)
  order by c.nome;
$$;

grant execute on function public.export_contatti() to authenticated;
revoke execute on function public.export_contatti() from anon;
