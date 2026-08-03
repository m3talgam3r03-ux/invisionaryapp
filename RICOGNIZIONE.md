# RICOGNIZIONE — Invisionary (STEP 0)

Analisi **read-only** del repo esistente, propedeutica alla fase di evoluzione M1→M14.
Nessuna riga di codice scritta, nessuna modifica al DB.

Data analisi: 3 agosto 2026 · Commit `81c45c3` · Branch `main` (working tree pulito)

---

## 1. Struttura

### Albero (sintesi)

```
src/
├─ app/                    route Expo Router (file-based)
│  ├─ _layout.tsx          provider: SafeArea, QueryClient, Auth, tema
│  ├─ (auth)/              sign-in, sign-up
│  └─ (app)/               index (dashboard) + 9 sezioni
│     ├─ clients/          index, [id], new, import
│     ├─ renewals/         index, [id], new
│     ├─ formazione/       index, [courseId], lezione/[lessonId], calendario, rete
│     ├─ calcolatori/      index, lottaggio, interesse-composto
│     ├─ trading/          index, [id], connetti, classifica
│     ├─ agente/           index, documenti
│     ├─ community/        index, nuovo
│     ├─ rank/             index
│     └─ admin/            index, [id]
├─ components/             Crest, ClientForm, RenewalForm, ClientPicker,
│  │                       YouTubePlayer(+.web), RankBadge
│  └─ ui/                  ThemedText, Screen, Card, Button, TextField,
│                          Avatar, EmptyState, SearchField
├─ lib/                    supabase, queryClient, + 20 moduli di dominio
├─ context/auth.tsx        AuthProvider (sessione + profilo)
├─ theme/                  colors, typography, spacing, brand, index
├─ hooks/                  use-color-scheme, use-speech, use-dictation
└─ types/                  models.ts, env.d.ts

supabase/
├─ migrations/             0001 → 0009 (9 file)
├─ functions/              ai-chat, ai-ingest, renewal-reminders,
│                          mt5-connect, mt5-sync, _shared/
└─ seed/formazione_demo.sql

demo/                      anteprima HTML interattiva (non è codice app)
knowledge/                 corpus Markdown per il RAG
scripts/                   seed utenti, build corpus, ingest, eval
```

### Versioni e scelte tecniche

| Ambito | Stato |
| --- | --- |
| Expo | SDK **57.0.8** · React Native **0.86.0** · React **19.2.3** |
| TypeScript | **6.0.3**, `strict` attivo, path alias `@/*` |
| Router | **Expo Router 57** file-based, gruppi `(auth)` / `(app)`, typed routes |
| Stato server | **TanStack Query 5** (nessun Redux/Zustand) |
| Stato locale | `useState` nei componenti; nessuno store globale oltre `AuthContext` |
| Backend | Supabase JS **2.110**, storage auth platform-aware (AsyncStorage su native, `undefined` su web per evitare crash SSR) |
| Build | EAS (non ancora configurato per produzione) |

**Coerente con lo stack richiesto.** Nessuna deviazione da correggere.

⚠️ `expo-speech-recognition@56.0.1` è pubblicato per SDK 56 mentre il progetto è su SDK 57: la compatibilità è da confermare al primo development build. Già annotato in `CLAUDE.md`.

---

## 2. Schema DB attuale

### Tabelle (14)

| Tabella | Colonne principali | RLS | Note |
| --- | --- | --- | --- |
| `profiles` | id (→auth.users), full_name, role, leader_id, created_at | ✅ | ruolo e gerarchia |
| `clients` | id, owner_id, nome, contatto, prodotto, note, created_at, updated_at | ✅ | CRM minimo |
| `renewals` | id, client_id, owner_id, prodotto, scadenza, alert_days_before, status, reminder_sent_at | ✅ | nessuna approvazione |
| `push_tokens` | id, user_id, token (unique) | ✅ | token Expo |
| `courses` | id, titolo, descrizione, ordine | ✅ | lettura autenticati, scrittura admin |
| `lessons` | id, course_id, titolo, youtube_id, ordine | ✅ | idem |
| `lesson_progress` | id, user_id, lesson_id, completed_at, unique(user,lesson) | ✅ | |
| `events` | id, titolo, descrizione, start_at, end_at, created_by | ✅ | calendario minimo |
| `trading_accounts` | id, owner_id, provider, login, server, metaapi_account_id, platform, region, state, name, balance, equity, currency, last_synced_at | ✅ | investor password **non** salvata |
| `trades` | id, account_id, owner_id, symbol, volume, profit, opened_at, closed_at, external_id, type, price, commission, swap, entry_type, time | ✅ | unique(account_id, external_id) |
| `feedback_posts` | id, owner_id, body, photo_url, author_name | ✅ | lettura di community |
| `documents` | id, source, content, metadata, embedding vector(1024), domain (generata) | ✅ | corpus RAG |
| `ai_conversations` | id, user_id, … | ✅ | chat privata |
| `ai_messages` | id, conversation_id, role, content | ✅ | chat privata |

### Funzioni e trigger

| Oggetto | Tipo | Scopo |
| --- | --- | --- |
| `is_admin()` | SQL, SECURITY DEFINER | evita ricorsione RLS su `profiles` |
| `can_read_member(uuid)` | SQL, SECURITY DEFINER | «sono io, è un mio collaboratore, o sono admin» |
| `handle_new_user()` | trigger su `auth.users` | crea il profilo con ruolo `collaborator` |
| `protect_profile_privileged_columns()` | trigger BEFORE UPDATE | anti privilege-escalation su `role` / `leader_id` |
| `set_updated_at()` | trigger | `clients.updated_at` |
| `match_documents()` / `match_knowledge()` | SQL | retrieval coseno, con boost sui domini |

### Edge Functions (5, tutte attive)

`ai-chat` · `ai-ingest` · `renewal-reminders` · `mt5-connect` · `mt5-sync`
Segreti lato server: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `METAAPI_TOKEN`. **Nessuna chiave di terze parti nel client** — la regola 5 è già rispettata.

### Schedulazioni

**Nessun cron attivo.** `supabase/README.md` documenta come schedulare `renewal-reminders` (dashboard o `pg_cron` + `pg_net`), ma non è stato eseguito. Le push oggi partono solo se la function viene invocata a mano.

---

## 3. Auth e ruoli

**Dove vive il ruolo:** colonna `profiles.role`, tipo `text` con `CHECK (role in ('admin','leader','collaborator'))`. Gerarchia su `profiles.leader_id` (self-FK, un livello).

**Come viene letto:** `AuthProvider` (`src/context/auth.tsx`) fa una query TanStack su `profiles` dopo il login ed espone `profile` nel contesto.

**Dove viene applicato:**
- **In UI:** `profile?.role === '…'` sparso in **8 file** (`formazione/index`, `formazione/rete`, `admin/index`, `admin/[id]`, `agente/index`, `agente/documenti`, `(app)/index`). Nessun modulo centralizzato.
- **In DB:** le policy RLS chiamano `is_admin()` e `can_read_member()`, che fanno una sotto-query su `profiles` a ogni valutazione.

**Guardia di navigazione:** `useProtectedRoute` gestisce solo *sessione sì/no*. **Non esiste alcuna guardia per ruolo a livello di routing.**

### ⚠️ Nessun claim JWT

Il ruolo **non è nel token**. Ogni policy risolve il ruolo con una sotto-query. Il custom access token hook richiesto da M1 è da costruire da zero.

---

## 4. Cosa esiste già, area per area

| Area | Stato | Dettaglio |
| --- | --- | --- |
| **CRM** | 🟡 minimo | `clients` con 4 campi liberi (nome, contatto, prodotto, note). Import CSV/XLSX con mappatura colonne e anteprima ✅. **Assenti:** stati pipeline, storico stati, tag, origine, consensi, deduplica, export, invii |
| **Rinnovi** | 🟡 parziale | CRUD + scadenzario ordinato + Edge Function reminder. **Assenti:** approvazione, storico, avanzamento automatico, reminder multipli |
| **Formazione** | 🟢 buono | courses/lessons/lesson_progress + player YouTube + vista rete per leader/admin. **Assenti:** `order_index`/`duration_min` espliciti (c'è `ordine`), `completed_manually`, % calcolata in DB |
| **Calcolatori** | 🟡 parziale | Lottaggio e interesse composto lato client, logica pura in `lib/calculators.ts`. **Assenti:** tabella strumenti, indici/metalli, tassi FX online, grafico ad area |
| **Classifica trader** | 🟡 da rifare | Ordinata per **rendimento %**, calcolata client-side. Contrasta con M5 (win rate, niente percentuali in classifica) |
| **Calendario** | 🔴 minimo | `events` con 5 campi. **Assenti:** tipo, visibilità, host, disponibilità, prenotazioni |
| **Dashboard / Rank** | 🟡 parziale | Rank a carte 2→A, pesi **cablati** in `lib/rank.ts` (`{lesson:10, client:5, renewal:3}`), soglie in array TS. Calcolo client-side |
| **Notifiche** | 🟡 parziale | `push_tokens` + Edge Function pronte, **cron non attivo**, un solo reminder per rinnovo |
| **Pagamenti** | 🔴 assente | Nessuna traccia di RevenueCat, IAP, entitlement, paywall |
| **Agente IA** | 🟢 avanzato | RAG completo (pgvector, Voyage, Claude), chat persistente, brain con playbook per dominio, eval offline/live. **Assenti:** `ai_memory` per utente, cap di spesa, integrazione CRM/funnel |
| **Community** | 🟢 funzionante | feedback con foto su Storage |
| **Web / desktop** | 🔴 assente | App Expo singola, nessun monorepo. `react-native-web` presente (export web funziona) |
| **Funnel** | 🔴 assente | — |
| **i18n** | 🔴 assente | Nessun `i18n/`. **Tutte** le stringhe sono hardcoded nei componenti |

---

## 5. Debito tecnico bloccante

### 🔴 Bloccanti per la DoD delle milestone

1. **Zero test.** Nessun `jest`/`vitest`, nessuno script `test`, nessuna cartella di test nel sorgente. La DoD di M1 («test automatici per ciascuno dei 3 ruoli») richiede di **introdurre da zero l'infrastruttura di test**, incluse dipendenze nuove (→ serve autorizzazione, regola 6) e un progetto Supabase di staging o locale su cui girare.

2. **Nessun modulo permessi.** 8 file con `role === '…'` inline. È esattamente ciò che M1 vuole eliminare.

3. **Nessuna i18n.** La regola 7 vieta stringhe hardcoded, ma oggi lo sono tutte, su ~30 schermate. Un'estrazione integrale in un colpo solo violerebbe la regola 2 (max ~15 file per milestone).

### 🟠 Prestazioni: calcoli client-side su tabelle intere

`useLeaderboard()` scarica **tutte** le righe di `profiles`, `lesson_progress`, `clients` e `renewals` e le aggrega in JavaScript. `useTraderLeaderboard()` fa lo stesso con `trades`. Non è un N+1 classico (le query sono 4 in parallelo), ma è O(tutte le righe visibili) a ogni apertura di schermata: regge la demo, non regge una rete reale. M4 e M5 devono spostare l'aggregazione in DB.

### 🟠 Reminder: un solo invio per rinnovo

`renewals.reminder_sent_at` è un singolo timestamp: una volta valorizzato, non parte più nulla. **Non può esprimere i tre invii −7 / −3 / −1** richiesti da M2. Serve un cambio di schema, non solo un cron.

### 🟡 Minori

- Gestione errori: le mutation mostrano l'errore in schermata, ma non c'è un error boundary globale né un logger.
- `documents` è leggibile da **qualsiasi utente autenticato**. Accettabile (è corpus condiviso), ma va dichiarato — e M12 dovrà isolare rigidamente `ai_memory` per utente.
- Nessun `down` nelle migrazioni esistenti (la regola 3 lo impone dalle prossime).
- `clients.contatto` è un campo unico e libero: email e telefono non sono separati né normalizzati. M6 richiede E.164 e deduplica → serve una migrazione dei dati.
- Componenti duplicati: nessuno di rilievo. `ui/` è già fattorizzato bene (Avatar, EmptyState, SearchField introdotti di recente).

---

## 6. Impatto per milestone

| # | Milestone | Stato | Rischio | Perché |
| --- | --- | --- | --- | --- |
| **M1** | Ruoli e permessi | 🟡 da modificare | **Alto** | Enum + claim JWT + `lib/permissions.ts` + i18n + **infrastruttura di test da zero**. Vedi §7 per i due nodi da sciogliere prima |
| **M2** | Rinnovi e scadenzario | 🟡 da modificare | **Alto** | Rinomina colonne, migra i valori di `status`, aggiunge approvazione e `renewal_history`, ridisegna i reminder, attiva `pg_cron` |
| **M3** | Formazione | 🟢 già presente | **Basso** | Aggiungere `completed_manually`, `duration_min`, e una view per la % |
| **M4** | Rank e dashboard | 🟡 da modificare | **Medio** | `rank_rules` + `rank_tiers` + materialized view + Edge Function oraria. Sostituisce i pesi cablati |
| **M5** | Classifica trader | 🔴 da rifare | **Alto** | Cambia la metrica (win rate), i vincoli e la visibilità. **Vedi §7.4: manca il dato per calcolare i trade** |
| **M6** | CRM | 🔴 quasi da zero | **Alto** | Stati, storico, tag, origine, consensi GDPR con enforcement in DB, deduplica E.164, export, invii server-side. Va spezzata in almeno 3 sotto-milestone |
| **M7** | Calcolatori | 🟡 da modificare | **Medio** | Tabella `instruments`, indici e metalli, conversione valuta, Edge Function FX con cache |
| **M8** | Calendario | 🔴 quasi da zero | **Medio** | Disponibilità, prenotazioni, `btree_gist` + exclusion constraint, fusi orari, `.ics` |
| **M9** | Punti e premi | 🔴 da zero | **Basso** | Tabelle nuove, dipende da M4 |
| **M10** | Condivisione social | 🔴 da zero | **Basso** | Nuove dipendenze (`react-native-view-shot`, `expo-sharing`) |
| **M11** | Web / desktop | 🔴 ristrutturazione | **Alto** | Da app singola a monorepo: tocca *tutti* i path di import. Da isolare in una milestone dedicata senza altre modifiche |
| **M12** | Agente IA | 🟡 da estendere | **Medio** | Base RAG solida. Da aggiungere: `ai_memory` per utente con isolamento verificato, cap di spesa, aggancio CRM |
| **M13** | Funnel | 🔴 da zero | **Medio** | Dipende da M11 (Next.js) e M6 |
| **M14** | Freemium e paywall | 🔴 da zero | **Alto** | RevenueCat + IAP + gating server-side. Nuove dipendenze e configurazione store |

---

## 7. Nodi da sciogliere prima di scrivere codice

Come da regola «se una richiesta è tecnicamente sbagliata o rischiosa, dillo prima di implementarla».

### 7.1 `collaboratore` (documento) vs `collaborator` (codice) — **serve una tua decisione**

Il documento specifica l'enum `admin | leader | collaboratore`. Il database e tutto il codice usano **`collaborator`** (inglese): il `CHECK` su `profiles.role`, il trigger `handle_new_user()`, 8 file di UI, lo script di seed, la demo.

Rinominare il valore significa: migrazione dati + aggiornare il CHECK + rileggere ogni policy + toccare gli 8 file + il seed. Rischio di rompere l'accesso in produzione se qualcosa sfugge.

**La mia raccomandazione:** tenere `collaborator` come valore tecnico e tradurre solo in UI (`i18n/it.ts` → «Collaboratore»). Il documento resta rispettato nella sostanza (3 ruoli, quei significati) senza una migrazione rischiosa a costo zero di valore.
**Se preferisci il rename**, lo faccio, ma va isolato in una milestone M1a a sé stante con un `down` testato.

### 7.2 Enum Postgres vs `text` + `CHECK`

Oggi è `text` + `CHECK`. Convertirlo in un vero `enum` richiede di rimuovere il default, alterare il tipo e ricreare le dipendenze: è una migrazione che prende un lock sulla tabella e va coordinata con le policy che leggono `role`.
Il beneficio pratico rispetto al `CHECK` esistente è modesto. **Confermi che vuoi l'enum vero**, o va bene mantenere `CHECK` (che vincola già allo stesso identico insieme di valori)?

### 7.3 Il claim JWT ha una latenza intrinseca — va gestita, non ignorata

Mettere il ruolo nel token è la scelta giusta per le prestazioni, ma il claim **resta fermo fino al refresh del token** (di norma ~1 ora). Conseguenza concreta: se un admin declassa un leader, quella persona **continua ad avere i permessi vecchi** finché il token non si rinnova.

Va previsto esplicitamente: forzare un `refreshSession()` dopo il cambio ruolo, e mantenere `is_admin()` come verifica autorevole sulle operazioni sensibili (approvazioni, pannello admin), usando il claim per il filtraggio di massa in lettura. Lo implemento così salvo tua indicazione diversa.

### 7.4 M5 non è calcolabile con lo schema attuale — **problema reale**

M5 chiede win rate su **trade chiusi** ed esclusione dei trade **sotto i 60 secondi**. Ma `trades` oggi memorizza i **deal** MetaApi, che sono eventi puntuali (`time`, `entry_type` = IN/OUT), non operazioni complete: `opened_at` e `closed_at` esistono come colonne ma non vengono popolate da `mt5-sync`, e **manca `position_id`**, che è l'unico modo per ricomporre l'ingresso con la sua uscita.

Senza `position_id` non si può stabilire né se un'operazione è in utile né quanto è durata. Prima di M5 serve quindi un passaggio su `mt5-sync` per salvare `positionId` e ricostruire le operazioni chiuse. **Questo contraddice il vincolo «non toccare l'integrazione MT5 oltre a quanto serve per M5»** solo in apparenza: è esattamente ciò che serve per M5, ma va messo in conto come lavoro aggiuntivo dentro quella milestone.

### 7.5 M6 è troppo grande per una milestone sola

Stati + storico + filtri + consensi GDPR + import/export + invii email/WhatsApp/SMS supera abbondantemente i ~15 file. Proposta di suddivisione:
- **M6a** — stati pipeline + `contact_status_history` + filtri
- **M6b** — consensi GDPR (`contact_consents`, viste `contactable_by_*`, export ed eliminazione)
- **M6c** — import/export con dichiarazione origine e deduplica E.164
- **M6d** — invii server-side (email via provider; WhatsApp sequenziale con limite dichiarato in UI)

Confermi questa suddivisione?

### 7.6 Nota sull'invio WhatsApp

Concordo con quanto già scritto nel documento e lo confermo dopo aver visto il codice: da app si può solo aprire `wa.me` un contatto alla volta. L'invio massivo richiede WhatsApp Business API con template approvati e costo per messaggio. Implementerò la modalità sequenziale con coda, dichiarando il limite in interfaccia.

### 7.7 Dipendenze nuove che serviranno (nessuna installata senza tuo ok)

| Milestone | Pacchetto | Perché | Alternativa nativa |
| --- | --- | --- | --- |
| M1 | `vitest` (o `jest`) + client Supabase | test RLS per ruolo | nessuna: senza test la DoD non è verificabile |
| M7 | nessuna | FX via Edge Function + `fetch` | — |
| M10 | `react-native-view-shot`, `expo-sharing` | rendering Stories 1080×1920 | nessuna |
| M11 | `turborepo` o `pnpm workspaces`, `next` | monorepo + web | nessuna |
| M14 | `react-native-purchases` (RevenueCat) | IAP + Play Billing | StoreKit/Billing nativi separati (molto più lavoro) |

Li elencherò di nuovo, uno per uno, quando la milestone li richiede.

---

## 8. Punto di partenza consigliato

Il repo è in **buono stato di salute**: RLS attiva ovunque, segreti solo server-side, migrazioni versionate e idempotenti, typecheck e lint puliti, componenti UI già fattorizzati. Non c'è debito che impedisca di partire.

Le due cose che mancano davvero e che **servono prima di M1** sono l'**infrastruttura di test** (senza cui la DoD di M1 non è dimostrabile) e la decisione su **§7.1** (valore del ruolo).

**Attendo il tuo «ok» e le risposte ai punti 7.1, 7.2, 7.5.** Poi procedo con M1 e mi fermo a fine milestone.
