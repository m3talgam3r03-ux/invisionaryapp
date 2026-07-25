# Invisionary — contesto per Claude Code

App mobile cross-platform (iOS + Android, App Store + Google Play) per una rete commerciale di **networker, assicuratori e trader**, con formazione ed educazione finanziaria. Sezioni: **Network/CRM · Trading · Formazione · Community**. Ruoli: `admin`, `leader`, `collaborator` (gerarchia a un solo livello: leader → collaboratori).

## ⛔ Regola d'oro

**NON generare tutto il progetto in un colpo solo.** Si lavora per **milestone**. Alla fine di ogni milestone: fermarsi, mostrare cosa è stato fatto e come testarlo, e **aspettare conferma** prima di procedere.

## Milestone (in ordine)

1. ✅ **Scaffold** — Expo + TS + Expo Router, client Supabase, tema dark-first, struttura pulita.
2. Auth + ruoli (Supabase Auth, `profiles`, routing condizionale, 3 utenti demo).
3. CRM `clients` + import CSV/Excel (SheetJS/papaparse, mappatura colonne + anteprima).
4. Rinnovi `renewals` + Edge Function cron per push X giorni prima della scadenza.
5. Formazione `courses`/`lessons` (player YouTube), `lesson_progress`, calendario `events`.
6. Calcolatori (lottaggio, interesse composto) — tutto lato client.
7. Pannello admin (utenti, ruoli, autorizzazioni).

Fasi successive **solo dopo richiesta esplicita**: agente AI (Anthropic + RAG con pgvector), MT5 read-only via MetaApi (investor password), feedback con foto, sistema di rank a carte.

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
