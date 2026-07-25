# Database Supabase — setup (Milestone 2)

## 1. Crea il progetto Supabase

- Su [supabase.com](https://supabase.com) crea un progetto in **regione EU** (es. *Frankfurt / eu-central-1*) per il GDPR.
- Da **Project Settings → API** copia:
  - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
  - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - **service_role** key → serve SOLO per il seed in locale (⚠️ mai nell'app, mai committata).

Metti URL e anon key nel file `.env` alla radice del progetto (vedi `.env.example`).

## 2. Applica la migrazione

Apri **SQL Editor** su Supabase Studio ed esegui le migrazioni **in ordine**:

1. [`migrations/0001_init.sql`](migrations/0001_init.sql) — `profiles` (+ ruoli, gerarchia,
   trigger di auto-creazione e anti-escalation), RLS esplicite e tabelle predisposte
   (`trading_accounts`, `trades`, `feedback_posts`).
2. [`migrations/0002_clients.sql`](migrations/0002_clients.sql) — tabella CRM `clients` con RLS.
3. [`migrations/0003_renewals.sql`](migrations/0003_renewals.sql) — `renewals` (scadenzario) e `push_tokens`, con RLS.

> In alternativa con Supabase CLI: `supabase link` poi `supabase db push`.

## 3. (Consigliato) Disabilita la conferma email per la demo

**Authentication → Providers → Email** → disattiva *"Confirm email"*, così la
registrazione in-app crea subito una sessione. Gli utenti demo del seed sono già
confermati a prescindere.

## 4. Seed dei 3 utenti demo

Dalla radice del progetto (PowerShell):

```powershell
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
node scripts/seed-demo-users.mjs
```

Crea (password comune `Invisionary!23`):

| Ruolo | Email |
| --- | --- |
| admin | `admin@invisionary.demo` |
| leader | `leader@invisionary.demo` |
| collaborator | `collab@invisionary.demo` (leader = Leader Demo) |

## Modello RLS (sintesi)

- **collaborator** → vede/modifica solo le proprie righe (`owner_id = auth.uid()`).
- **leader** → vede anche i propri collaboratori (`leader_id = auth.uid()`), in sola lettura.
- **admin** → accesso completo; unico a poter cambiare ruoli e gerarchia.

Le funzioni `is_admin()` / `can_read_member()` sono `SECURITY DEFINER` per evitare
la ricorsione nelle policy.

## Notifiche push e reminder rinnovi (Milestone 4)

Gli avvisi di scadenza sono inviati dalla Edge Function
[`functions/renewal-reminders`](functions/renewal-reminders/index.ts), schedulata via cron.

**Prerequisiti push:** i token Expo si ottengono solo su **dispositivo fisico** e con un
**progetto EAS** (`npx eas init`). L'app registra automaticamente il token in `push_tokens`
al login; su web/emulatore la registrazione viene saltata.

**Deploy della function** (richiede Supabase CLI + `supabase link`):

```bash
supabase functions deploy renewal-reminders
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono già disponibili nell'ambiente della function.

**Schedulazione (cron):** dal Dashboard → *Edge Functions → renewal-reminders → Schedules*
imposta un cron giornaliero (es. `0 8 * * *`). In alternativa, via SQL (pg_cron + pg_net):

```sql
select cron.schedule(
  'renewal-reminders-daily',
  '0 8 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT-REF>.functions.supabase.co/renewal-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
     ); $$
);
```

**Test manuale:**

```bash
supabase functions invoke renewal-reminders --no-verify-jwt
```

> La logica: rinnovi `active` con `reminder_sent_at` NULL la cui scadenza è entro
> `alert_days_before` giorni → push all'owner → `reminder_sent_at` valorizzato (niente doppioni).
> Modificare scadenza o stato di un rinnovo azzera `reminder_sent_at` per un nuovo ciclo.

## Agente AI — RAG (fase successiva)

Architettura: **embedding domanda (Voyage AI) → retrieval su pgvector → generazione con Claude**.
La chiave Anthropic vive **solo** nell'Edge Function, mai nel client.

> Embedding con **Voyage** (`voyage-3.5`, 1024 dim): Anthropic non fornisce un'API di
> embedding e raccomanda Voyage. È sostituibile con un altro provider allineando modello e
> dimensione a `vector(1024)` in [`0005_rag.sql`](migrations/0005_rag.sql).

1. Applica la migrazione [`0005_rag.sql`](migrations/0005_rag.sql) (abilita `pgvector`, crea
   `documents` + la funzione `match_documents`).
2. Imposta i secret delle function (chiavi segrete, mai nel repo):

   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... VOYAGE_API_KEY=pa-...
   ```

3. Fai il deploy delle Edge Function:

   ```bash
   supabase functions deploy ai-chat
   supabase functions deploy ai-ingest
   ```

4. Applica anche [`0006_ai_conversations.sql`](migrations/0006_ai_conversations.sql) (persistenza chat, privata per utente).
5. Popola la base di conoscenza **dall'app**: come admin apri **Agente AI → Base di conoscenza** e incolla i contenuti (usa la function `ai-ingest`). L'app interroga l'agente tramite [`src/lib/ai.ts`](../src/lib/ai.ts) (`askAgent`) dalla schermata di chat, con cronologia salvata.
