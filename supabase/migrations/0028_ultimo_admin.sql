-- ============================================================================
-- Invisionary — Migrazione 0028: non si resta senza amministratori.
-- Prerequisiti: 0001 (profiles, is_admin, protect_profile_privileged_columns).
-- Idempotente.
--
-- ⚠️ IL PROBLEMA CHE RISOLVE
-- Dal pannello admin si può cambiare il ruolo di chiunque, sé stessi compresi.
-- `protect_profile_privileged_columns()` (0001, esteso in 0016) impedisce a un
-- NON admin di toccarsi il ruolo — quella parte è a posto, non c'è escalation.
-- Ma un admin sì: può mettersi «collaboratore» con due tocchi.
--
-- Se è l'ultimo, da quel momento `is_admin()` è falso per tutti. Nessuno può
-- più aprire il pannello, assegnare ruoli, gestire la base di conoscenza,
-- approvare riscatti. E nessuno può rimediare DALL'APP, perché rimediare
-- richiede di essere admin. Si esce solo dalla dashboard di Supabase con la
-- chiave service_role — cioè: l'app va in mano allo sviluppatore, non a chi
-- la usa. Per una rete che si autogestisce è un guasto serio, e nasce da due
-- tocchi fatti per sbaglio.
--
-- Lo stesso vale per la cancellazione: eliminare l'ultimo admin è identico a
-- degradarlo.
--
-- ── PERCHÉ NEL DATABASE E NON NELL'INTERFACCIA ──
-- Nell'interfaccia ci va comunque (nascondere il pulsante evita l'errore
-- prima che accada). Ma nascondere non è impedire: la stessa `update` passa
-- da PostgREST con un `curl`. La regola sta dove vale sempre.
--
-- ── L'USCITA DI SICUREZZA ──
-- Il controllo NON scatta quando `auth.uid()` è nullo, cioè dall'SQL editor e
-- con service_role. È voluto: chi ha quella chiave può già fare tutto, e deve
-- poter riparare una situazione bloccata. Un guardrail che non si può togliere
-- nemmeno da lì è una trappola, non una protezione.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Quanti amministratori restano, escludendo una riga.
--
--    SECURITY DEFINER perché deve contare TUTTI gli admin, e chi sta scrivendo
--    potrebbe non avere il permesso di leggerli (`profiles_select` mostra a un
--    collaboratore solo sé stesso). Senza definer il conteggio darebbe zero a
--    chi non vede nessuno, e bloccherebbe aggiornamenti innocui.
-- ----------------------------------------------------------------------------
create or replace function public.altri_admin(p_escluso uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles
  where role = 'admin'
    and id is distinct from p_escluso;
$$;

comment on function public.altri_admin(uuid) is
  'Quanti amministratori esistono oltre a p_escluso. Serve a non restare senza.';

-- ----------------------------------------------------------------------------
-- 2. Il guardrail sull'aggiornamento.
--
--    Scatta solo quando un admin STA SMETTENDO di esserlo. Tutti gli altri
--    aggiornamenti di `profiles` (nome, regione, leader, vip_call_host)
--    passano senza nemmeno contare.
-- ----------------------------------------------------------------------------
create or replace function public.vieta_ultimo_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Fuori da una sessione utente (SQL editor, service_role) non si interviene:
  -- è l'unica via per rimettere a posto un progetto rimasto senza admin.
  if auth.uid() is null then
    return new;
  end if;

  if old.role = 'admin' and new.role <> 'admin' and public.altri_admin(old.id) = 0 then
    raise exception 'ultimo_amministratore'
      using hint = 'Nomina un altro amministratore prima di togliere questo ruolo.';
  end if;

  return new;
end;
$$;

comment on function public.vieta_ultimo_admin() is
  'Impedisce di togliere il ruolo admin all''ultimo che ce l''ha: l''app resterebbe ingestibile.';

-- Dopo `protect_profile_columns`, che rimette a posto `new.role` per i non
-- admin: così quel ripristino non viene mai scambiato per una degradazione.
-- I trigger BEFORE dello stesso evento scattano in ordine alfabetico di nome,
-- e «protect_...» viene prima di «zz_vieta_...».
drop trigger if exists zz_vieta_ultimo_admin on public.profiles;
create trigger zz_vieta_ultimo_admin
  before update on public.profiles
  for each row execute function public.vieta_ultimo_admin();

-- ----------------------------------------------------------------------------
-- 3. Lo stesso sulla cancellazione: eliminare l'ultimo admin è degradarlo.
-- ----------------------------------------------------------------------------
create or replace function public.vieta_cancella_ultimo_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return old;
  end if;

  if old.role = 'admin' and public.altri_admin(old.id) = 0 then
    raise exception 'ultimo_amministratore'
      using hint = 'Nomina un altro amministratore prima di eliminare questo account.';
  end if;

  return old;
end;
$$;

drop trigger if exists zz_vieta_cancella_ultimo_admin on public.profiles;
create trigger zz_vieta_cancella_ultimo_admin
  before delete on public.profiles
  for each row execute function public.vieta_cancella_ultimo_admin();

-- ----------------------------------------------------------------------------
-- 4. Permessi.
-- ----------------------------------------------------------------------------
grant execute on function public.altri_admin(uuid) to authenticated;
revoke execute on function public.altri_admin(uuid) from anon;
