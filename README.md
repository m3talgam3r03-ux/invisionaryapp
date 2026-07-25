# Invisionary — Winning Dream Team

App mobile cross-platform (iOS + Android) per una rete commerciale di **networker, assicuratori e trader**, con formazione ed educazione finanziaria integrate.

Tre sezioni principali — **Network/CRM**, **Trading**, **Formazione** (+ **Community**) — e tre ruoli utente: `admin`, `leader`, `collaborator`.

> **Stato attuale: Milestone 1 — Scaffold.** Base del progetto pronta: Expo + TypeScript, Expo Router, client Supabase, tema dark-first con i design token del brand, struttura cartelle pulita.

---

## Stack

| Ambito | Tecnologia |
| --- | --- |
| Frontend | React Native + **Expo (SDK 57)** · TypeScript strict · **Expo Router** (routing file-based) |
| Backend/DB/Auth | **Supabase** (Postgres + Auth + RLS + Storage + Realtime), regione EU (GDPR) |
| Data fetching | **TanStack Query** |
| UI | Componenti riutilizzabili · tema chiaro/scuro (**default scuro**) |

---

## Prerequisiti

- **Node.js** ≥ 20 (testato con v24) e npm
- App **Expo Go** sul telefono (iOS/Android) per la prova più rapida
- _(Windows)_ se `node`/`npm` non vengono riconosciuti nel terminale, assicurati che `C:\Program Files\nodejs` sia nella variabile d'ambiente **PATH**

## Avvio in locale

1. **Installa le dipendenze**

   ```bash
   npm install
   ```

2. **Configura le variabili d'ambiente**

   Copia `.env.example` in `.env` e inserisci i valori del tuo progetto Supabase (regione EU):

   ```bash
   cp .env.example .env
   ```

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   > Finché `.env` contiene i placeholder, l'app parte comunque e mostra lo stato **"Supabase non configurato"**.

3. **Avvia l'app**

   ```bash
   npx expo start
   ```

   Dal menu di Expo puoi:
   - premere **`a`** per l'emulatore Android o **`i`** per il simulatore iOS (macOS),
   - premere **`w`** per aprire la versione **web** nel browser,
   - oppure **inquadrare il QR code con Expo Go** sul telefono.

## Script utili

```bash
npm run start       # avvia il dev server Expo
npm run android     # avvia su Android
npm run ios         # avvia su iOS (richiede macOS)
npm run web         # avvia la versione web
npm run typecheck   # controllo tipi TypeScript (tsc --noEmit)
npm run lint        # ESLint (expo lint)
```

## Struttura del progetto

```
src/
├── app/                 # Route (Expo Router, file-based)
│   ├── _layout.tsx      # Layout root: provider SafeArea, TanStack Query, tema dark
│   └── index.tsx        # Landing brandizzata + stato connessione Supabase
├── components/ui/       # Componenti riutilizzabili (ThemedText, Screen, Card)
├── hooks/               # Hook condivisi (use-color-scheme)
├── lib/                 # Client Supabase, QueryClient
├── theme/               # Design system: colors, typography, spacing, brand
└── types/               # Tipizzazioni (env)
```

## Design system (estratto)

- **Colori** — background `#0E0E10`, surface `#1A1A1D`, text `#F5F3EF`, muted `#8A8A90`, accent/rosso carte `#C8102E`, oro `#C9A227`, success `#2E8B57`, error `#D21F3C`.
  - Il **rosso** è solo per accenti/CTA/stati; l'**oro** solo per rank e vittorie.
- **Semi → pilastri** — ♠ Trading · ♥ Network · ♦ Formazione · ♣ Community.
- **Estetica** — premium, dark-first, "mano vincente". Nessun immaginario da azzardo.

## Compliance

Contenuti di trading/formazione a **scopo educativo**, non consulenza finanziaria. Nessuna promessa di rendimento. I dati clienti del CRM sono dati personali (GDPR): storage in EU, con export/cancellazione previsti.

## Roadmap (milestone)

1. ✅ **Scaffold** (questa milestone)
2. ⏳ Auth + ruoli (Supabase Auth, `profiles`, routing per ruolo)
3. ⏳ CRM + import CSV/Excel
4. ⏳ Rinnovi + avvisi push
5. ⏳ Formazione (corsi/lezioni/calendario)
6. ⏳ Calcolatori (lottaggio, interesse composto)
7. ⏳ Pannello admin

_Fasi successive (da confermare): agente AI (RAG), integrazione MT5 read-only, feedback con foto, sistema di rank a carte._
