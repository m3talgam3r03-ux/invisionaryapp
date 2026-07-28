# Base di conoscenza dell'agente AI

Questa cartella **è** la competenza dell'agente. Il modello fornisce il linguaggio e il ragionamento; questi documenti forniscono il metodo, i criteri e i vincoli che rendono le risposte quelle di Invisionary e non quelle di un chatbot generico.

## Come è organizzata

```
knowledge/
  00-metodo.md                  come si ragiona su qualsiasi problema
  60-mindset-e-organizzazione.md
  90-compliance.md              ha precedenza su tutto il resto
  vendita/       fondamenti · scoperta · obiezioni · chiusura e follow-up
  marketing/     posizionamento · contenuti · acquisizione contatti
  network/       prospecting · invito e presentazione · duplicazione · leadership
  investimenti/  educazione finanziaria · rischio e diversificazione
  trading/       risk management · analisi e strategia · psicologia e journal
```

## Formato dei file

Ogni file è Markdown con front-matter YAML:

```markdown
---
title: Gestione delle obiezioni
domain: vendita
tags: [vendita, obiezioni, prezzo]
---

## Prima sezione
...
```

- **`title`** — diventa la `source` citata dall'agente nelle risposte ("fonte: Gestione delle obiezioni"). Deve essere leggibile da un utente finale.
- **`domain`** — uno tra: `metodo`, `vendita`, `marketing`, `network`, `investimenti`, `trading`, `mindset`, `piattaforma`, `compliance`. Il router dell'agente usa il dominio per dare priorità ai chunk pertinenti alla domanda.
- **`tags`** — facoltativi, salvati nei metadati.

Il testo viene spezzato per **sezione** (`##`/`###`), non a lunghezza fissa: ogni chunk conserva titolo e intestazione. Sezioni ben titolate migliorano direttamente la qualità delle risposte.

## Caricare o aggiornare il corpus

Dalla radice del progetto, con credenziali di un utente `admin`:

```bash
node scripts/ingest-knowledge.mjs --dry
```

```bash
node scripts/ingest-knowledge.mjs
```

Su PowerShell le credenziali si passano così:

```bash
$env:INGEST_EMAIL="admin@esempio.it"; $env:INGEST_PASSWORD="..."; node scripts/ingest-knowledge.mjs
```

L'operazione è **idempotente**: ogni file sostituisce i propri chunk precedenti (stessa `source`). Si può rilanciare a ogni modifica senza duplicare nulla. Per caricare un solo ramo: `--only=trading`.

## Come si scrive un buon documento

L'agente cita e riusa questi testi: vanno scritti per essere letti da chi fa il mestiere, non per riempire pagine.

- **Un principio, poi l'applicazione.** Le affermazioni astratte non aiutano nessuno a decidere.
- **Numeri e tabelle dove esistono.** Un conto chiude una discussione che un'opinione lascia aperta.
- **Dire cosa NON si fa.** Le sezioni "cosa non si fa" sono le più usate dall'agente, perché sono quelle che tengono le risposte dentro i limiti.
- **Niente promesse.** Nessun guadagno, nessun rendimento, nessun risultato garantito — vedi `90-compliance.md`, che ha precedenza su qualunque altro contenuto.
- **Sezioni brevi con titoli espliciti**, perché il chunking segue le intestazioni.

## Aggiungere un dominio nuovo

Serve modificare tre punti coerentemente:

1. `supabase/functions/_shared/brain.ts` — nuova voce in `DOMAINS` con playbook e lessico del router.
2. `scripts/ingest-knowledge.mjs` — aggiungere l'id all'insieme `DOMAINS` di validazione.
3. Questa cartella — i documenti del dominio.

Senza il punto 1 i documenti vengono comunque trovati dalla ricerca semantica, ma non ricevono il boost di dominio né attivano un playbook dedicato.
