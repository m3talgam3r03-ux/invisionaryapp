# Prompt per Lovable

Copia **tutto il blocco fra le righe di trattini** e incollalo in Lovable come primo
messaggio.

## Prima di incollare, tre cose

**1. Non dargli mai la chiave `service_role`.** Nel prompt c'è solo la chiave
pubblicabile, che è fatta apposta per stare dentro il codice del client: a
proteggere i dati sono le policy RLS in Postgres, non la segretezza di quella
chiave. La `service_role` invece scavalca ogni policy — se finisce in un
progetto Lovable, finisce nel codice generato, e da lì chiunque legge tutto.

**2. Quello che ne esce è un SECONDO frontend, non un aggiornamento del primo.**
L'app Expo continua a esistere e a essere quella pubblicata sugli store. Le due
condividono il database e nient'altro: ogni modifica alle schermate va fatta due
volte, o le due divergono. È un costo reale, non un dettaglio.

**3. Il database non si tocca.** Il prompt glielo dice in modo esplicito, ma
vale la pena saperlo anche tu: lo schema è già applicato, 48 fra tabelle e
viste, 39 funzioni. Se Lovable prova a crearne di suoi, fermalo.

---

Costruisci un'applicazione web in italiano per **Invisionary**, la piattaforma di
una rete di network marketing e trader con formazione ed educazione finanziaria.

## Vincolo più importante: il database esiste già

Collegati a un progetto **Supabase esistente**. **NON creare tabelle, NON creare
policy, NON modificare lo schema**: è già applicato e protetto da Row Level
Security. Il tuo compito è costruire l'interfaccia sopra a ciò che c'è.

```
SUPABASE_URL = https://dlokqehfjbnxzsomlmnq.supabase.co
SUPABASE_PUBLISHABLE_KEY = sb_publishable_EraaZ1kqTF_VB4_dQqNGjg_jvl9Joun
```

Usa `@supabase/supabase-js` con questa chiave. Autenticazione email + password
già configurata. **Non chiedere e non usare mai una service_role key.**

Se una query torna vuota non è un errore da aggirare: è la RLS che sta facendo
il suo lavoro. Non provare a girarci intorno.

## Ruoli

Tre: `admin`, `leader`, `collaboratore`. Gerarchia a un solo livello — un leader
ha dei collaboratori, `profiles.leader_id` punta al leader.

Chi vede cosa (lo impone già il database, l'interfaccia deve rispecchiarlo):

- **collaboratore**: solo le proprie righe (`owner_id = auth.uid()`)
- **leader**: le proprie più quelle dei propri collaboratori
- **admin**: tutto

Regole che l'interfaccia deve rispettare:

- Il pannello amministratore e la gestione della base di conoscenza sono **solo**
  dell'admin.
- Vedere l'avanzamento formazione della rete, lo scadenzario di tutta la rete, il
  filtro per proprietario nel CRM e la pubblicazione della propria disponibilità:
  **admin e leader**.
- Approvare un rinnovo: l'admin sempre; il leader solo per i propri
  collaboratori, e **mai il proprio**.
- **L'ultimo amministratore non può togliersi il ruolo** né essere eliminato. Il
  database lo rifiuta con l'eccezione `ultimo_amministratore`: intercettala e
  scrivi una frase, non l'identificatore.

Centralizza i permessi in **una sola funzione** `can(user, azione, risorsa?)`.
Nessun confronto `role === 'admin'` sparso nei componenti.

## Le quattro sezioni

Sono i quattro semi delle carte, e sono anche la navigazione principale:

- **♠ Trading** — conti MT5 in sola lettura, andamento in percentuale, elenco
  operazioni, classifica trader.
- **♥ Network / CRM** — contatti, fasi della trattativa, storico dei passaggi,
  consensi per canale, rinnovi.
- **♦ Formazione** — corsi, lezioni con video YouTube, avanzamento, calendario
  eventi, avanzamento della rete per chi la guida.
- **♣ Community** — post con foto, cancellabili da chi li ha scritti.

Più: dashboard, agente AI, calcolatori, appuntamenti, punti e premi, mappa
dell'Italia, rank, pannello admin.

## Tabelle principali

- `profiles` (id, full_name, role, leader_id, vip_call_host, fuso, regione)
- `clients` (id, owner_id, nome, contatto, email, telefono_e164, prodotto, note,
  stato, origine, tags, ultimo_contatto_at) — `stato` è una fase della
  trattativa: nuovo, contattato, appuntamento, cliente, perso
- `contact_status_history` — ogni passaggio di fase, con chi e quando
- `contact_consents` + `consent_history` — consenso **per canale** (email, sms,
  whatsapp, telefono), con copia del testo dell'informativa accettata
- `renewals` (client_id, owner_id, prodotto, current_due_date, interval_days,
  status, requested_at/by, approved_at/by) + `renewal_history`
- `courses`, `lessons` (youtube_id, duration_min), `lesson_progress`, `events`
- `trading_accounts`, `trades`, `trading_config`, `leaderboard_snapshots`
- `points_ledger`, `points_balance`, `reward_catalog`, `reward_redemptions`
- `bookings`, `availability_rules`, `availability_exceptions`
- `ai_conversations`, `ai_messages`, `ai_memory`, `ai_budget`, `ai_usage`
- `feedback_posts`, `instruments`, `fx_rates`, `rank_rules`, `rank_tiers`

Viste utili: `v_avanzamento_corso`, `v_avanzamento_globale`, `v_operazioni`,
`contactable_by_email` / `_sms` / `_whatsapp` / `_telefono`.

## Funzioni da chiamare con `rpc()`, non da riscrivere

Fanno cose che l'interfaccia non deve rifare: il calcolo sta nel database perché
lì è atomico e vede dati che il client non può leggere.

- `classifica()` — classifica rank, già filtrata sul perimetro di chi chiama
- `classifica_trader(dal, al)` — classifica sulla quota di operazioni in utile
- `podio(mese)`, `graduatoria_mese(mese)` — podio del mese chiuso
- `slot_liberi(host, da, a)` — **solo** gli orari liberi, mai quelli occupati
- `puo_prenotare_con(host)` — se posso prenotare con quella persona
- `riscatta_premio(id)`, `decidi_riscatto(...)`, `assegna_bonus(...)`
- `mappa_iscritti(soglia)`, `riepilogo_mappa(soglia)` — conteggi per regione
- `export_contact_data(id)`, `delete_contact_data(id)` — GDPR
- `trova_duplicati(...)`, `normalizza_email(...)`, `normalizza_telefono(...)`
- `budget_ai()`, `altri_admin(id)`

## Sistema visivo

**Scuro di default.** Una sola famiglia: **Manrope** (Google Fonts), pesi 400,
500, 600, 700, 800.

```
fondo          #0A0A0C
scheda         #161618
dentro scheda  #1F1F22
separatore     #2C2C30
testo          #F7F7F8
testo tenue    #98989F
testo debole   #6C6C74
accento        #E5334E   (rosso carte — riempimenti, ciò che si tocca)
accento testo  #FF6B7F   (il rosso quando fa da TESTO: il pieno non ha contrasto)
oro            #E0B23C   (SOLO rank e vittorie, mai altro)
verde          #30D158
errore         #FF453A
```

Raggi: 10 (chip) · 14 (campi e pulsanti) · 20 (schede) · 32 (fogli).

Tipografia — **frase normale, mai MAIUSCOLO**, tracking negativo sui corpi
grandi:

```
display  34/41  peso 800  tracking -0.8
titolo   28/34  peso 700  tracking -0.6
heading  20/25  peso 600  tracking -0.4
corpo    17/24  peso 400  tracking -0.2
etichetta 15/20 peso 600  tracking -0.2
didascalia 13/18 peso 400
```

Regole non negoziabili dell'aspetto:

- **Niente MAIUSCOLO nei titoli.** Toglie il profilo alle parole e su una
  schermata piena si legge tutto due volte.
- **Niente bordi sulle schede.** La profondità si fa con il livello (fondo →
  scheda → dentro-scheda) più un'ombra morbida. Otto schede bordate diventano
  una griglia di rettangoli.
- **Il colore è un accento.** Superfici quasi neutre; il rosso su ciò che si
  tocca e su ciò che è in ritardo. L'oro solo su rank e traguardi.
- **Nessun immaginario da azzardo**: niente fiches, roulette, tavoli verdi. I
  semi delle carte sì — sono il marchio — ma l'estetica è «eccellenza», non
  «gioco d'azzardo».
- Un pulsante premuto si **rimpicciolisce** del 3%, non sbiadisce.
- Un campo mostra il bordo **solo quando ha il fuoco**.

## Regole di scrittura

Tutti i testi in **italiano**, raccolti in **un solo file** di traduzioni: mai
stringhe scritte dentro i componenti.

**Non mostrare mai il messaggio grezzo del database.** Traducilo per categoria:
rete irraggiungibile, permesso negato, sessione scaduta, non trovato, duplicato,
troppo lento. Il testo originale va in console, non sullo schermo: non aiuta chi
legge e racconta com'è fatto il database a chi guarda.

**Ogni azione che fallisce deve dirlo.** In particolare quelle in cui l'utente
crede di aver fatto qualcosa: revocare un consenso, disdire un appuntamento,
eliminare un contatto. Un fallimento silenzioso su un consenso è la cosa
peggiore che questa app possa fare.

## Compliance — obbligatorio, non opzionale

- **Nessuna promessa di rendimento o guadagno, da nessuna parte.** Né nei testi,
  né negli esempi, né nei segnaposto dei campi.
- Trading e formazione sono **educativi, non consulenza finanziaria**: il
  disclaimer va sempre visibile, non nascosto in un menu.
- Le classifiche mostrano la **quota di operazioni chiuse in utile**, mai importi
  né rendimenti. I risultati di altri non sono risultati ottenibili.
- I contatti del CRM sono **dati personali**: consenso per canale, esportazione e
  cancellazione disponibili, e sulla mappa le regioni con pochi iscritti non
  mostrano il numero (uno non è una statistica, è una persona).

## Come voglio che tu lavori

Procedi **per parti**: prima l'accesso e la dashboard, poi una sezione alla
volta. Fermati alla fine di ognuna e mostrami cosa hai fatto. Non generare tutto
in un colpo solo.

Se una cosa che ti ho chiesto è tecnicamente sbagliata o rischiosa, **dimmelo
prima di farla**. Non voglio esecuzione cieca.
