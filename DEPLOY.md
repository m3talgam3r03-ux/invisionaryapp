# Deploy & test — Invisionary

Guida passo-passo per **accendere il backend** (Supabase) e **provare l'app dal vivo**.
Comandi pensati per **Windows / PowerShell** (usano `npx`, niente installazioni globali).

> Le Edge Function **richiedono la Supabase CLI** (via `npx supabase …`). Il database
> puoi applicarlo dalla CLI **oppure** incollando le migrazioni nel SQL Editor.

---

## 0. Prerequisiti

- Node ≥ 20 e dipendenze installate (`npm install`).
- Account **Supabase** (supabase.com) — progetto in **regione EU** (GDPR).
- Chiavi opzionali per le funzioni avanzate:
  - **Agente AI**: `ANTHROPIC_API_KEY` (console.anthropic.com) + `VOYAGE_API_KEY` (voyageai.com).
  - **Trading MT5**: account **MetaApi.cloud** + `METAAPI_TOKEN`.
- Un telefono con **Expo Go** (test più fedele) oppure il browser (`w`).

---

## 1. Crea il progetto Supabase

1. supabase.com → **New project** → regione **EU** (es. *Frankfurt / eu-central-1*).
2. **Project Settings → API**: copia **Project URL**, **anon public key**, **service_role key**.
3. **Project Settings → General**: copia il **Reference ID** (il `<ref>` del progetto).

---

## 2. Configura il file `.env`

Copia `.env.example` in `.env` e inserisci URL + anon key:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

> `.env` è già ignorato da git. La `service_role` **non** va qui (è solo per il seed).

---

## 3. Applica il database (migrazioni `0001` → `0008`)

Scegli **una** delle due strade.

**A) SQL Editor (consigliata, sempre funziona).** Apri **SQL Editor** su Supabase e incolla
ed esegui **in ordine** ogni file in [`supabase/migrations/`](supabase/migrations), da
`0001_init.sql` a `0008_trading.sql`. Poi, **facoltativo**, incolla il seed dimostrativo
[`supabase/seed/formazione_demo.sql`](supabase/seed/formazione_demo.sql).

**B) Supabase CLI.**

```powershell
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

> Se `db push` non riconosce i file numerati `000x`, usa la strada **A** per le migrazioni
> (le function si deployano comunque dalla CLI, vedi punto 5).

---

## 4. Impostazione Auth (per la demo)

**Authentication → Providers → Email** → disattiva **"Confirm email"**, così gli account
demo accedono subito.

---

## 5. Secret + deploy delle Edge Function (CLI)

Imposta **solo** i secret che ti servono, poi fai il deploy:

```powershell
npx supabase secrets set ANTHROPIC_API_KEY=<...> VOYAGE_API_KEY=<...> METAAPI_TOKEN=<...>

npx supabase functions deploy ai-chat
npx supabase functions deploy ai-ingest
npx supabase functions deploy renewal-reminders
npx supabase functions deploy mt5-connect
npx supabase functions deploy mt5-sync
```

| Function | Serve per | Secret |
|---|---|---|
| `ai-chat`, `ai-ingest` | Agente AI (RAG) | `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` |
| `renewal-reminders` | Push rinnovi (cron) | — (usa quelli iniettati) |
| `mt5-connect`, `mt5-sync` | Trading MT5 | `METAAPI_TOKEN` |

> In alternativa ai punti 3B+5 puoi lanciare lo script [`scripts/deploy.ps1`](scripts/deploy.ps1).

---

## 6. Utenti demo

Dalla radice del progetto (PowerShell), con la **service_role** key:

```powershell
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
node scripts/seed-demo-users.mjs
```

Credenziali (password comune `Invisionary!23`): `admin@invisionary.demo`,
`leader@invisionary.demo`, `collab@invisionary.demo`.

---

## 7. Avvia l'app e prova

```bash
npx expo start
```

Premi **`w`** (web) oppure inquadra il **QR con Expo Go**.

### Checklist di test

- [ ] **Login** con i 3 utenti → dashboard diversa per ruolo (admin/leader/collaboratore).
- [ ] **CRM** (♥ Network): crea un cliente; **Importa** un CSV (mappatura colonne + anteprima).
- [ ] **Scadenzario**: crea un rinnovo; urgenza a colori (rosso/oro).
- [ ] **Formazione** (♦): con il seed, corso → lezione → video → «Segna come completata»; da leader/admin apri **Avanzamento rete**.
- [ ] **Calcolatori**: lottaggio e interesse composto (calcolo live).
- [ ] **Agente AI**: da admin apri **Agente AI → Base di conoscenza**, incolla del testo; poi fai una domanda in chat.
- [ ] **Rank**: crest + classifica.
- [ ] **Community** (♣): pubblica un feedback con foto.
- [ ] **Trading** (♠): «Collega MT5» (login, server, **investor password**) → attendi ~1 min → **Sincronizza** → operazioni + rendimento %.
- [ ] **Admin**: cambia ruolo/leader di un utente.

---

## 8. (Facoltativo) Schedulazioni cron

- **Reminder rinnovi**: Dashboard → *Edge Functions → renewal-reminders → Schedules* (es. `0 8 * * *`), oppure via `pg_cron` (vedi [`supabase/README.md`](supabase/README.md)).
- **Sync MT5** periodico: stessa logica su `mt5-sync`.

---

## 9. Prossimo passo: pubblicazione sugli store

Per App Store / Google Play si usa **EAS Build**:

```bash
npx eas init
npx eas build -p android   # oppure -p ios (richiede account Apple)
```

> ⚠️ Le build native/EAS possono avere problemi con lo **spazio** nel percorso della cartella
> (`app invisionary`). Se emergono errori in fase di prebuild, valuta di spostare il progetto
> in un percorso senza spazi.

---

## Troubleshooting

| Sintomo | Causa / Soluzione |
|---|---|
| "backend non configurato" | `.env` mancante o coi placeholder → punto 2 |
| Errore su una tabella | Migrazione non applicata o fuori ordine → punto 3 |
| L'agente non risponde | Secret `ANTHROPIC_API_KEY`/`VOYAGE_API_KEY` mancanti o function non deployata |
| Import foto/file non va | Provalo su **dispositivo reale** (Expo Go), non solo su web |
| MT5 "non connesso" | Attendi ~1 min dopo il collegamento, poi **Sincronizza** |
| `node`/`npx` non riconosciuti | Aggiungi `C:\Program Files\nodejs` al PATH |
