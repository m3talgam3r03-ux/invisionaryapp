# Database Supabase — setup (Milestone 2)

## 1. Crea il progetto Supabase

- Su [supabase.com](https://supabase.com) crea un progetto in **regione EU** (es. *Frankfurt / eu-central-1*) per il GDPR.
- Da **Project Settings → API** copia:
  - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
  - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - **service_role** key → serve SOLO per il seed in locale (⚠️ mai nell'app, mai committata).

Metti URL e anon key nel file `.env` alla radice del progetto (vedi `.env.example`).

## 2. Applica la migrazione

Apri **SQL Editor** su Supabase Studio, incolla il contenuto di
[`migrations/0001_init.sql`](migrations/0001_init.sql) ed esegui.

Crea: `profiles` (+ ruoli, gerarchia, trigger di auto-creazione e anti-escalation),
le RLS esplicite per ogni tabella, e le tabelle predisposte `trading_accounts`,
`trades`, `feedback_posts`.

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
