# Invisionary — contesto per Claude Code

App mobile cross-platform (iOS + Android, App Store + Google Play) per una **rete di network marketing (networker) e trader**, con formazione ed educazione finanziaria. NON è un'app assicurativa. Sezioni: **Network/CRM · Trading · Formazione · Community**. Ruoli: `admin`, `leader`, `collaborator` (gerarchia a un solo livello: leader → collaboratori).

## ⛔ Regola d'oro

**NON generare tutto il progetto in un colpo solo.** Si lavora per **milestone**. Alla fine di ogni milestone: fermarsi, mostrare cosa è stato fatto e come testarlo, e **aspettare conferma** prima di procedere.

## Milestone (in ordine)

1. ✅ **Scaffold** — Expo + TS + Expo Router, client Supabase, tema dark-first, struttura pulita.
2. ✅ **Auth + ruoli** (Supabase Auth, `profiles` + RLS, routing per ruolo, 3 utenti demo). Setup DB: `supabase/README.md`.
3. ✅ **CRM `clients`** + import CSV/Excel (SheetJS/papaparse, mappatura colonne + anteprima). Migrazione `0002_clients.sql`.
4. ✅ **Rinnovi `renewals`** + Edge Function cron per push X giorni prima della scadenza. Migrazione `0003_renewals.sql`; function `supabase/functions/renewal-reminders`.
5. ✅ **Formazione** `courses`/`lessons` (player YouTube), `lesson_progress`, calendario `events`, vista avanzamento rete (leader/admin). Migrazione `0004_formazione.sql` + seed demo.
6. ✅ **Calcolatori** (lottaggio, interesse composto) — tutto lato client (`src/lib/calculators.ts`).
7. ✅ **Pannello admin** (utenti, ruoli, gerarchia). Route `(app)/admin`; data layer `src/lib/admin.ts`.

✅ **Agente AI (RAG)** completo: `0005_rag.sql` (pgvector) + `0006_ai_conversations.sql` (chat persistente, RLS privata); Edge Function `ai-chat`/`ai-ingest` (embedding Voyage `voyage-3.5` 1024d, generazione Claude `claude-opus-5`, chiave Anthropic solo lato server); UI chat `(app)/agente` con cronologia salvata + UI admin "Base di conoscenza".

✅ **Cervello dell'agente** (`0009_ai_brain.sql`): competenza esperta in vendita, marketing, network marketing, investimenti e trading.
- `supabase/functions/_shared/brain.ts` — nucleo del prompt (identità, metodo, compliance) + un **playbook per dominio**; `detectDomains()` classifica la domanda con un lessico pesato (ancorato a inizio parola) e `buildSystem()` inietta solo i playbook pertinenti.
- `supabase/functions/_shared/context.ts` — **contesto dell'utente** (ruolo, anzianità, lezioni, clienti, rinnovi in scadenza, squadra, MT5) iniettato nel prompt. Solo aggregati del chiamante: **mai** nomi o dati personali di clienti o collaboratori.
- Pipeline `ai-chat`: identità → router → query contestualizzata sui follow-up (`buildRetrievalQuery`) → ricerca ampia (24 candidati) → **rerank** Voyage `rerank-2.5` → 6 estratti → Claude. Il rerank è fail-safe: se non risponde si prosegue con l'ordine per similarità.
- `match_knowledge()` — retrieval coseno con **boost sui domini rilevati** (`documents.domain`, colonna generata da `metadata->>'domain'`).
- `node scripts/eval-brain.mjs` — set di valutazione. Offline (router, contestualizzazione, presenza dei limiti) senza chiavi; `--live` esegue la pipeline completa e verifica fonti attese e casi da rifiutare. **Lanciarlo dopo ogni modifica a prompt, lessico o retrieval.**
- `knowledge/` — corpus versionato in Markdown con front-matter (`title`, `domain`, `tags`); chunking per sezione (`chunkMarkdown`). Caricamento idempotente con `node scripts/ingest-knowledge.mjs` (`--dry`, `--only=<ramo>`). Vedi `knowledge/README.md`.
- `knowledge/90-compliance.md` ha **precedenza su ogni altro contenuto** della base di conoscenza.

✅ **Rank a carte** (2→Asso): punteggio trasparente (lezioni/clienti/rinnovi), classifica di rete (RLS), crest oro. `src/lib/rank.ts` + `src/lib/leaderboard.ts`, route `(app)/rank`.

✅ **Community** (feedback con foto su Supabase Storage): `0007_feedback.sql` (bucket `feedback` + RLS), route `(app)/community`, upload via `expo-image-picker` + `base64-arraybuffer`.

✅ **MT5 read-only** (MetaApi): connessione con investor password (mai salvata), sync deal/saldo via Edge Function `mt5-connect`/`mt5-sync` (secret `METAAPI_TOKEN`), performance in %, classifica trader. `0008_trading.sql`, route `(app)/trading`.

**Tutte le fasi del brief sono implementate.** Resta la messa in produzione: progetto Supabase (EU) + migrazioni `0001→0008` + secret + deploy delle Edge Function, poi test end-to-end.

## Stack (usare questo)

- **Expo SDK 57** · React Native 0.86 · React 19 · TypeScript **strict** · Expo Router.
- **Supabase** (Postgres + Auth + RLS + Storage + Realtime), **regione EU** (GDPR).
- **TanStack Query** per data fetching. UI: componenti riutilizzabili, tema chiaro/scuro (**default scuro**).
- Notifiche: Expo Notifications + Supabase Edge Function (cron). Import file: SheetJS (xlsx) + papaparse (csv), lato client. Build: EAS.

> ⚠️ Expo cambia spesso: consultare i docs versionati **https://docs.expo.dev/versions/v57.0.0/** prima di scrivere codice che tocca le API Expo.

## Convenzioni

- **Nessun segreto hardcoded** → variabili `EXPO_PUBLIC_*` in `.env` (mai la `service_role` sul client).
- TypeScript strict, componenti piccoli e riutilizzabili. Commenti in italiano dove utile.
- Commit atomici con messaggi chiari.
- Ambiente: **Windows**, PowerShell. Node è in `C:\Program Files\nodejs` (potrebbe non essere nel PATH della shell). Il percorso del progetto contiene uno spazio (`app invisionary`) — ok per Expo Go/web; occhio a prebuild native/EAS più avanti.

## Guardrail di compliance (obbligatori nel codice e nei testi)

- Nessuna promessa di rendimento o garanzia di guadagno, da nessuna parte.
- Trading/formazione = **educativo, non consulenza finanziaria** → disclaimer sempre presenti.
- Dati CRM = dati personali (GDPR): storage EU, minimizzazione, export/cancellazione.
- Estetica: eccellenza/"mano vincente", **mai** immaginario da azzardo (fiches, roulette, tavoli verdi).

## Struttura

```
src/app/          route Expo Router (_layout.tsx = provider; index.tsx = landing)
src/components/ui  componenti riutilizzabili (ThemedText, Screen, Card)
src/lib/           supabase.ts (client), queryClient.ts
src/theme/         colors, typography, spacing, brand (semi→pilastri, rank, ruoli), index (useTheme dark-first)
src/hooks/         use-color-scheme
```

## Comandi

```bash
npm install
npm run typecheck   # tsc --noEmit
npx expo start      # a=Android  i=iOS  w=web  (o QR con Expo Go)
```

## Modello dati (target Fase 0, RLS Postgres)

`profiles` (role, leader_id) · `clients` (owner_id) · `renewals` (client_id, scadenza, alert_days_before) · `courses` · `lessons` (youtube_id) · `lesson_progress` · `events`. Predisporre vuote con RLS: `trading_accounts`, `trades`, `feedback_posts`.

RLS: collaborator → solo proprie righe (`owner_id = auth.uid()`); leader → proprie + collaboratori (`leader_id = leader.id`, lettura sui dati altrui); admin → accesso completo.
