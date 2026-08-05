-- ============================================================================
-- Invisionary — Migrazione 0018: consensi per canale, export e cancellazione.
-- Prerequisito: 0017_crm_stati.sql.
-- Idempotente.
--
-- Secondo pezzo di M6. Import/export dei contatti (M6c) e invii (M6d) seguono.
--
-- IL VINCOLO CHE CONTA
-- «Nessun invio massivo può partire verso contatti senza consenso attivo per
-- quel canale. Vincolo a livello di database, non solo di interfaccia.»
-- Qui il vincolo è una VISTA per canale: le funzioni di invio leggeranno solo
-- da lì e non da `clients`. Un'interfaccia si aggira, una vista no — e chi
-- scriverà l'invio in M6d non deve nemmeno doversi ricordare la regola.
--
-- Un consenso non è un booleano: è un fatto avvenuto in un momento, per un
-- canale, con un testo che la persona ha letto. Senza quel contesto non si
-- dimostra nulla, ed è esattamente ciò che un'autorità chiede di dimostrare.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. I consensi, uno per canale.
-- ----------------------------------------------------------------------------
create table if not exists public.contact_consents (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  canale          text not null check (canale in ('email', 'sms', 'whatsapp', 'telefono')),
  valore          boolean not null,
  /** Da dove arriva il consenso: serve a dimostrarne la provenienza. */
  origine         text not null check (origine in ('manuale', 'import', 'funnel')),
  /** Il testo effettivamente mostrato alla persona quando ha acconsentito. */
  testo_informativa text,
  registrato_da   uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  -- Un solo consenso corrente per canale: la storia sta in consent_history.
  unique (client_id, canale)
);

create index if not exists contact_consents_client_idx on public.contact_consents (client_id);

comment on table public.contact_consents is
  'Consenso corrente per canale. Un consenso generico non basta: email, SMS, WhatsApp e telefono sono decisioni separate.';

-- ----------------------------------------------------------------------------
-- 2. Storico dei consensi: append-only.
--    Serve a dimostrare non solo che c'è il consenso, ma quando è stato dato o
--    revocato. È la parte che conta se qualcuno contesta un invio.
-- ----------------------------------------------------------------------------
create table if not exists public.consent_history (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  canale            text not null,
  valore            boolean not null,
  origine           text,
  testo_informativa text,
  actor_id          uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists consent_history_client_idx
  on public.consent_history (client_id, created_at desc);

comment on table public.consent_history is
  'Storico append-only dei consensi. Non si modifica e non si cancella: è la prova.';

create or replace function public.consents_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.consent_history
    (client_id, canale, valore, origine, testo_informativa, actor_id)
  values
    (new.client_id, new.canale, new.valore, new.origine, new.testo_informativa, auth.uid());
  return new;
end;
$$;

drop trigger if exists consents_log_trigger on public.contact_consents;
create trigger consents_log_trigger
  after insert or update on public.contact_consents
  for each row execute function public.consents_log();

-- ----------------------------------------------------------------------------
-- 3. RLS: i consensi seguono il contatto a cui appartengono.
-- ----------------------------------------------------------------------------
alter table public.contact_consents enable row level security;
alter table public.consent_history enable row level security;

drop policy if exists contact_consents_select on public.contact_consents;
create policy contact_consents_select on public.contact_consents
  for select using (
    exists (select 1 from public.clients c
            where c.id = contact_consents.client_id and public.can_read_member(c.owner_id))
  );

-- Scrivere un consenso è possibile solo sui PROPRI contatti: un leader legge la
-- rete ma non dichiara consensi al posto dei suoi collaboratori.
drop policy if exists contact_consents_write on public.contact_consents;
create policy contact_consents_write on public.contact_consents
  for all
  using (
    exists (select 1 from public.clients c
            where c.id = contact_consents.client_id
              and (c.owner_id = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.clients c
            where c.id = contact_consents.client_id
              and (c.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists consent_history_select on public.consent_history;
create policy consent_history_select on public.consent_history
  for select using (
    exists (select 1 from public.clients c
            where c.id = consent_history.client_id and public.can_read_member(c.owner_id))
  );

grant select, insert, update, delete on public.contact_consents to authenticated;
grant select on public.consent_history to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Chi è contattabile, canale per canale.
--
--    Queste viste sono IL vincolo: le funzioni di invio (M6d) leggeranno solo
--    da qui. Un contatto senza riga di consenso non compare — l'assenza non è
--    un sì, e il silenzio non è consenso.
--
--    security_invoker: il perimetro resta quello della RLS di `clients`.
-- ----------------------------------------------------------------------------
drop view if exists public.contactable_by_email;
create view public.contactable_by_email with (security_invoker = on) as
  select c.id as client_id, c.owner_id, c.nome, c.contatto
  from public.clients c
  join public.contact_consents k
    on k.client_id = c.id and k.canale = 'email' and k.valore;

drop view if exists public.contactable_by_sms;
create view public.contactable_by_sms with (security_invoker = on) as
  select c.id as client_id, c.owner_id, c.nome, c.contatto
  from public.clients c
  join public.contact_consents k
    on k.client_id = c.id and k.canale = 'sms' and k.valore;

drop view if exists public.contactable_by_whatsapp;
create view public.contactable_by_whatsapp with (security_invoker = on) as
  select c.id as client_id, c.owner_id, c.nome, c.contatto
  from public.clients c
  join public.contact_consents k
    on k.client_id = c.id and k.canale = 'whatsapp' and k.valore;

drop view if exists public.contactable_by_telefono;
create view public.contactable_by_telefono with (security_invoker = on) as
  select c.id as client_id, c.owner_id, c.nome, c.contatto
  from public.clients c
  join public.contact_consents k
    on k.client_id = c.id and k.canale = 'telefono' and k.valore;

grant select on
  public.contactable_by_email,
  public.contactable_by_sms,
  public.contactable_by_whatsapp,
  public.contactable_by_telefono
to authenticated;

comment on view public.contactable_by_email is
  'Contatti raggiungibili via email. Le funzioni di invio leggono SOLO da qui: è il vincolo, non un filtro di comodo.';

-- ----------------------------------------------------------------------------
-- 5. Diritto di accesso: tutto ciò che sappiamo di una persona, in un colpo.
-- ----------------------------------------------------------------------------
create or replace function public.export_contact_data(contact_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (
      select 1 from public.clients c
      where c.id = contact_id and public.can_read_member(c.owner_id)
    ) then null                                  -- fuori perimetro: nulla
    else jsonb_build_object(
      'esportato_il', now(),
      'contatto', (select to_jsonb(c) from public.clients c where c.id = contact_id),
      'consensi', coalesce(
        (select jsonb_agg(to_jsonb(k)) from public.contact_consents k where k.client_id = contact_id),
        '[]'::jsonb),
      'storico_consensi', coalesce(
        (select jsonb_agg(to_jsonb(h) order by h.created_at)
         from public.consent_history h where h.client_id = contact_id),
        '[]'::jsonb),
      'storico_fasi', coalesce(
        (select jsonb_agg(to_jsonb(s) order by s.created_at)
         from public.contact_status_history s where s.client_id = contact_id),
        '[]'::jsonb),
      'rinnovi', coalesce(
        (select jsonb_agg(to_jsonb(r)) from public.renewals r where r.client_id = contact_id),
        '[]'::jsonb)
    )
  end;
$$;

grant execute on function public.export_contact_data(uuid) to authenticated;
revoke execute on function public.export_contact_data(uuid) from anon;

-- ----------------------------------------------------------------------------
-- 6. Diritto alla cancellazione, con registro di chi e quando.
--
--    Il registro NON conserva i dati cancellati: sarebbe una cancellazione
--    finta. Tiene solo la traccia dell'avvenuta cancellazione, che è ciò che
--    va dimostrato.
-- ----------------------------------------------------------------------------
create table if not exists public.deletion_log (
  id           uuid primary key default gen_random_uuid(),
  entita       text not null,
  entita_id    uuid not null,
  /** Impronta del nome, per rispondere a «avete cancellato Tizio?» senza tenerlo. */
  nome_hash    text,
  motivo       text,
  actor_id     uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.deletion_log enable row level security;

drop policy if exists deletion_log_select on public.deletion_log;
create policy deletion_log_select on public.deletion_log
  for select using (public.is_admin());

grant select on public.deletion_log to authenticated;

comment on table public.deletion_log is
  'Registro delle cancellazioni. Non conserva i dati cancellati: solo la prova che sono stati cancellati.';

create or replace function public.delete_contact_data(contact_id uuid, motivo text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  proprietario uuid;
  nome_contatto text;
begin
  select c.owner_id, c.nome into proprietario, nome_contatto
  from public.clients c where c.id = contact_id;

  if proprietario is null then
    return false;
  end if;
  -- Cancellare è del proprietario o dell'admin: un leader legge, non cancella.
  if not (proprietario = auth.uid() or public.is_admin()) then
    raise exception 'Non autorizzato a cancellare questo contatto.';
  end if;

  insert into public.deletion_log (entita, entita_id, nome_hash, motivo, actor_id)
  values ('client', contact_id, md5(coalesce(nome_contatto, '')), motivo, auth.uid());

  -- I consensi, gli storici e i rinnovi cadono in cascata dalle chiavi esterne.
  delete from public.clients where id = contact_id;
  return true;
end;
$$;

grant execute on function public.delete_contact_data(uuid, text) to authenticated;
revoke execute on function public.delete_contact_data(uuid, text) from anon;
