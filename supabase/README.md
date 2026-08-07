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

- **collaboratore** → vede/modifica solo le proprie righe (`owner_id = auth.uid()`).
- **leader** → vede anche i propri collaboratori (`leader_id = auth.uid()`), in sola lettura.
- **admin** → accesso completo; unico a poter cambiare ruoli e gerarchia.

Le funzioni `is_admin()` / `can_read_member()` sono `SECURITY DEFINER` per evitare
la ricorsione nelle policy.

## Ruolo nel token (migrazione 0011) — richiede un passaggio manuale

La `0011` crea l'hook `custom_access_token_hook`, che copia `profiles.role` dentro
`app_metadata.role` del JWT: così le policy leggono il ruolo dal token invece di
interrogare `profiles` a ogni riga.

**L'hook va attivato a mano**, la migrazione non può farlo:

1. Supabase → **Authentication → Hooks**
2. **Customize Access Token (JWT) Claims** → abilita
3. Scegli la funzione `public.custom_access_token_hook`
4. Fai logout/login: i token nuovi conterranno il claim

> Applicare la migrazione **senza** attivare l'hook non rompe nulla: `is_admin()`
> usa il claim solo se c'è e altrimenti ripiega su `profiles`. Vale anche per le
> sessioni emesse prima dell'attivazione, che continuano a funzionare.

**Il claim può restare indietro.** Il token dura circa un'ora: se un admin cambia
il ruolo a qualcuno, per quella persona il claim resta quello vecchio fino al
rinnovo. L'app se ne accorge da sola — `AuthProvider` confronta il claim con la
riga di `profiles` e, se divergono, chiede subito un token nuovo. Per questo le
operazioni delicate restano comunque protette da `is_admin()`, che a quel punto
rilegge il valore aggiornato.

### Verificare che funzioni

```sql
-- da un client autenticato (non dal SQL Editor, che non ha un JWT utente)
select public.jwt_role();   -- deve restituire admin | leader | collaboratore
```

## Test automatici delle policy

`tests/rls.test.ts` verifica dal vivo che ogni ruolo veda esattamente le righe
attese. Vanno eseguiti su un **progetto di prova** (scrivono e cancellano dati):

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
npm test
```

Senza la chiave i test RLS si saltano con un avviso; quelli del modulo permessi
(`tests/permissions.test.ts`) girano sempre.

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

### Quando parte cosa (migrazione 0013)

| Avviso | A chi | Quando |
| --- | --- | --- |
| Promemoria scadenza | al proprietario del rinnovo | a **−7, −3 e −1 giorni** |
| Riepilogo della rete | ai leader | **una volta a settimana** |

Quali rinnovi siano da avvisare lo decide `rinnovi_da_avvisare()` nel database, non
la Edge Function: la regola è una sola e si può verificare con una query.

Il doppio invio è impossibile per costruzione: `renewal_reminders` ha come chiave
primaria `(renewal_id, offset_days)`, quindi una seconda esecuzione nello stesso
giorno non manda nulla. Se il cron salta dei giorni, all'arrivo si manda **un solo**
avviso e si registrano tutti gli scaglioni saltati, invece di sparare tre notifiche
uguali. Spostando la scadenza il ciclo riparte da capo (lo fa un trigger).

**Schedulazione (cron).** Servono **due** pianificazioni. Dal Dashboard →
*Edge Functions → renewal-reminders → Schedules*, oppure via SQL (pg_cron + pg_net):

```sql
-- Promemoria: ogni giorno alle 8
select cron.schedule(
  'renewal-reminders-daily',
  '0 8 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT-REF>.functions.supabase.co/renewal-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer <SERVICE_ROLE_KEY>')
     ); $$
);

-- Riepilogo ai leader: ogni lunedì alle 8
select cron.schedule(
  'renewal-summary-weekly',
  '0 8 * * 1',
  $$ select net.http_post(
       url := 'https://<PROJECT-REF>.functions.supabase.co/renewal-reminders',
       headers := jsonb_build_object(
         'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
         'Content-Type', 'application/json'
       ),
       body := '{"modo":"riepilogo"}'::jsonb
     ); $$
);
```

**Verificare senza mandare push:**

```sql
select * from public.rinnovi_da_avvisare();   -- chi riceverebbe il promemoria oggi
select * from public.riepilogo_rinnovi_leader();
```

**Test manuale:**

```bash
supabase functions invoke renewal-reminders --no-verify-jwt
```

> La logica: rinnovi `active` con `reminder_sent_at` NULL la cui scadenza è entro
> `alert_days_before` giorni → push all'owner → `reminder_sent_at` valorizzato (niente doppioni).
> Modificare scadenza o stato di un rinnovo azzera `reminder_sent_at` per un nuovo ciclo.

## Rank: regole configurabili e ricalcolo (migrazione 0015)

I pesi del punteggio stanno in `rank_rules` e i livelli in `rank_tiers`: si
modificano dal database (o dal pannello admin) **senza rilasciare l'app**.

```sql
-- Quanto vale una lezione completata
update public.rank_rules set points_per_unit = 15 where metric = 'lezioni_completate';
```

Il nuovo peso vale **subito**: i pesi si applicano alla lettura. Quello che si
aggiorna su pianificazione sono le *metriche* (quante lezioni, quanti clienti…),
che stanno in una vista materializzata perché contarle a ogni apertura di
schermata sarebbe sprecato.

**Ricalcolo orario** delle metriche:

```sql
select cron.schedule(
  'refresh-rank-hourly',
  '0 * * * *',
  $$ select public.refresh_rank(); $$
);
```

> ⚠️ **Le viste materializzate non supportano la RLS.** Postgres non applica le
> policy a una matview: per questo `mv_rank_metriche` **non è accessibile** agli
> utenti e si esce solo dalla funzione `classifica()`, che filtra con
> `can_read_member()`. Quel filtro *è* la protezione — se un giorno si concedesse
> `select` sulla matview, i punti di tutti diventerebbero pubblici.

Verifica del perimetro:

```sql
select * from public.classifica();   -- da un client autenticato, non dal SQL Editor
```

## Classifica trader (migrazione 0016)

Ordinata sul **win rate** — quota di operazioni chiuse in utile — non sul
rendimento. In classifica **non compaiono mai importi né percentuali di
guadagno**: è un vincolo di prodotto, e un test lo verifica sulle colonne.

I vincoli anti-manipolazione sono nel database, non nell'interfaccia:

| Vincolo | Dove |
| --- | --- |
| Solo conti collegati a MetaApi | `metaapi_account_id is not null` |
| Operazioni sotto i 60 secondi escluse | `trading_config.durata_minima_secondi` |
| Almeno 20 operazioni nel mese | `trading_config.min_trade_periodo` |
| Parità: profit factor → n. operazioni → anzianità | `order by` di `classifica_trader()` |

Le soglie si cambiano senza rilascio:

```sql
update public.trading_config set min_trade_periodo = 30 where id;
```

> ⚠️ **Serve `position_id`.** `trades` contiene i *deal* MetaApi, che sono eventi
> puntuali: ingresso e uscita sono righe distinte. Senza `position_id` non si sa
> né l'esito né la durata di un'operazione. La colonna la popola `mt5-sync`: dopo
> aver applicato la 0016 **rideploya la function e risincronizza**, altrimenti le
> operazioni già importate restano senza e la classifica resta vuota.

```bash
npx supabase functions deploy mt5-sync
```

**Podio mensile congelato.** A inizio mese si fotografano i primi tre del mese
appena chiuso: la storia non si riscrive quando arrivano nuovi trade.

```sql
select cron.schedule(
  'congela-podio-mensile',
  '0 3 1 * *',                    -- il primo del mese alle 3
  $$ select public.congela_podio(); $$
);
select cron.schedule(
  'punti-classifica-mensile',
  '10 3 1 * *',                   -- dieci minuti dopo, a podio congelato
  $$ select public.assegna_punti_classifica(); $$
);
```

Rieseguirli è innocuo: il vincolo di unicità su `(periodo, posizione)` e la
chiave primaria di `points_classifica_assegnati` rifiutano il doppione invece
di sovrascrivere o pagare due volte.

> ⚠️ **La 0016 aveva un difetto che la 0024 chiude.** `congela_podio()`
> chiamava `classifica_trader()`, che filtra le righe con
> `can_read_member(p.id)`. Da `pg_cron` non c'è nessun utente autenticato:
> `auth.uid()` è NULL, quel predicato vale NULL per ogni riga, e **il podio
> veniva congelato vuoto** senza che nessuno se ne accorgesse. Ora la
> graduatoria si calcola con `graduatoria_mese()`, che non filtra per
> visibilità; il filtro resta solo sulla classifica mostrata a video.
>
> Se hai già applicato la 0016 in produzione, controlla:
> ```sql
> select periodo, count(*) from public.leaderboard_snapshots group by periodo;
> ```
> I mesi con zero righe si rigenerano con `select public.congela_podio('2026-07-01');`

## Strumenti e cambi (migrazione 0020)

Gli strumenti del calcolatore di lottaggio stanno in tabella (`instruments`) e
non nel codice: aggiungere una coppia o correggere la dimensione di un
contratto — che **varia da broker a broker**, soprattutto sugli indici — non
richiede un rilascio dell'app.

```sql
insert into public.instruments (symbol, tipo, contract_size, quote_currency, pip_size, unita, ordine)
values ('UK100', 'indice', 1, 'GBP', 1, 'punto', 60);
```

**Perché serve la cache dei cambi.** Il valore del pip nasce nella valuta di
**quotazione** dello strumento, non in quella del conto: su GBP/USD un pip vale
10 USD, e con un conto in EUR quei 10 USD vanno convertiti. Saltare la
conversione non dà errore — fa solo rischiare una cifra diversa da quella
decisa, e ce ne si accorge dopo, sul conto.

La Edge Function [`functions/fx-rates`](functions/fx-rates/index.ts) riempie
`fx_rates`; l'app legge sempre da lì con la funzione `cambio(base, quote)`, che
restituisce anche **da quanti minuti** il tasso è fermo.

```bash
npx supabase functions deploy fx-rates
```

```sql
select cron.schedule(
  'fx-rates-hourly',
  '0 * * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT-REF>.functions.supabase.co/fx-rates',
       headers := '{"Authorization": "Bearer <SERVICE-ROLE-KEY>"}'::jsonb
     ); $$
);
```

> **Il calcolatore non si blocca mai.** Se il fornitore non risponde, la
> function non tocca nulla e l'app continua con l'ultimo valore noto, mostrando
> di quando è. Un tasso di un'ora fa è molto meglio di un calcolatore che non
> calcola: chi deve aprire una posizione la aprirebbe comunque, a occhio. Se
> invece il cambio manca del tutto, l'app lo dichiara e **chiede di inserirlo a
> mano** — mai un valore inventato.

`fx_rates` è in **sola lettura** per gli utenti autenticati: non esiste alcuna
policy di scrittura, quindi ci scrive soltanto il `service_role` dalla function.
Un utente che potesse alterare un cambio potrebbe alterare il lottaggio di
chiunque.

## Disponibilità e prenotazioni (migrazione 0021)

Un collaboratore prenota una call col proprio leader scegliendo fra gli orari
liberi. Due cose, qui, si rompono sempre allo stesso modo.

### 1. La doppia prenotazione

Controllare «lo slot è libero?» e poi inserire **è una corsa**: fra la lettura e
la scrittura passa del tempo, e due persone che aprono l'app insieme prenotano
lo stesso orario senza che nessuna se ne accorga. Nessun controllo applicativo
lo evita.

Lo evita un vincolo di esclusione, che è atomico:

```sql
exclude using gist (host_id with =, durante with &&) where (stato = 'confermata')
```

Serve `btree_gist` (la migrazione la installa) per mettere un uuid e un range
nello stesso indice. Ce n'è un **secondo** sull'ospite: nemmeno chi prenota può
essere in due posti insieme.

Il `where (stato = 'confermata')` non è un dettaglio: senza, una prenotazione
annullata continuerebbe a occupare lo slot e riprenotare lo stesso orario
sarebbe impossibile.

> **L'app deve riconoscere l'errore `23P01`**, non mostrarlo. Non è un guasto:
> è il vincolo che fa il suo lavoro. `classificaErrore()` in
> [`src/lib/booking.ts`](../src/lib/booking.ts) lo traduce in «qualcuno ha preso
> questo orario un attimo prima».

### 2. I fusi orari

«Sono libero il martedì dalle 9 alle 12» è un'ora **locale**, e in UTC cambia
due volte l'anno con l'ora legale. Per questo:

| Cosa | Tipo | Perché |
| --- | --- | --- |
| `availability_rules.ora_inizio` | `time` + `profiles.fuso` | le 9 restano le 9 |
| `bookings.inizio` | `timestamptz` | un appuntamento è un istante assoluto |

La conversione la fa Postgres con `at time zone`, che ha il database dei fusi
aggiornato. Farla in JavaScript sarebbe sbagliato due domeniche l'anno.

Nell'ora che il cambio fa sparire Postgres sposta in avanti; in quella che si
ripete sceglie la prima occorrenza. In entrambi i casi il risultato è un istante
ben definito, quindi il vincolo di esclusione continua a proteggere.

### Cosa vede chi prenota

`slot_liberi()` è **SECURITY DEFINER** perché per sapere cosa è libero deve
leggere le prenotazioni dell'host — che l'ospite non deve poter vedere.
Restituisce **solo gli slot liberi**, mai quelli occupati e mai con chi:
«9:00 occupato (Marco Rossi)» direbbe a un collaboratore con chi parla il suo
leader.

```sql
select * from public.slot_liberi('<uuid-host>', current_date, current_date + 21);
```

Chi può vedere l'agenda di chi lo decide `puo_prenotare_con()`: il proprio
leader, l'amministrazione, i propri collaboratori. Non chiunque.

### Un orario qualsiasi non si prenota

Il vincolo di esclusione impedisce le sovrapposizioni ma non impedisce di
scrivere all'API un orario inventato. A questo pensa il trigger
`bookings_verifica_slot()`, che verifica che l'orario sia fra quelli pubblicati.
Resta una verifica preventiva — e va bene: la corsa la chiude il vincolo di
esclusione, questo controlla la legittimità.

Gli orari sono **immutabili** dopo l'inserimento (`bookings_orari_immutabili`):
si annulla e si riprenota, così resta traccia. Un update potrebbe altrimenti
spostare una prenotazione fuori dagli slot pubblicati, aggirando il trigger che
agisce solo in insert.

### Fuso di ciascuno

```sql
update public.profiles set fuso = 'Europe/London' where id = '<uuid>';
```

### Promemoria (migrazione 0022)

A 24 ore e a 1 ora dall'appuntamento, a **entrambe** le persone: un
appuntamento è un impegno reciproco, e avvisare solo chi ha prenotato
lascerebbe l'altro a scoprirlo da solo.

```bash
npx supabase functions deploy booking-reminders
```

```sql
select cron.schedule(
  'booking-reminders',
  '*/15 * * * *',                 -- ogni quarto d'ora
  $$ select net.http_post(
       url := 'https://<PROJECT-REF>.functions.supabase.co/booking-reminders',
       headers := '{"Authorization": "Bearer <SERVICE-ROLE-KEY>"}'::jsonb
     ); $$
);
```

Il doppio invio è impossibile per costruzione: la chiave primaria di
`booking_reminders` è `(booking_id, offset_minuti)`. Se il cron salta dei giri,
all'arrivo si manda **un solo** avviso e si registrano tutti gli scaglioni
coperti, così non riemergono al giro dopo.

### File .ics

`src/lib/ics.ts` genera il file secondo la RFC 5545: CRLF, righe piegate a 75
**ottetti** (non caratteri: in italiano «è» pesa due byte) e protezione di
`\ ; ,` e degli a capo. Se una di queste salta, Google Calendar e Apple
Calendar rifiutano il file senza dire perché — per questo ognuna ha un test.

| Piattaforma | Stato |
| --- | --- |
| Web | ✅ scaricamento del file |
| iOS / Android | ✅ file in cache + foglio di condivisione (`expo-sharing`) |

`Share.share({ url })` di React Native non basta: è supportato solo su iOS, e su
Android `message` manda testo semplice che nessuna app di calendario
interpreta. Con `expo-sharing` il foglio riceve un vero file e «Aggiungi a
Calendario» compare su entrambe. Il pulsante resta comunque condizionato a
`isAvailableAsync()`: dove il sistema non sa aprirlo, non compare.

## Punti e premi (migrazione 0023)

> ⚠️ **I punti premio non sono i punti del rank.** Sono due cose diverse e
> devono restare separate.
>
> | | Cosa sono | Si spendono? |
> | --- | --- | --- |
> | Punti **rank** (0015) | un **livello**, ricalcolato dalle metriche | no |
> | Punti **premio** (0023) | una **valuta**: si accumulano e si spendono | sì |
>
> Confonderle sarebbe un errore serio in due modi. Chi riscatta un premio
> vedrebbe **scendere il proprio rank** — perderebbe un traguardo per aver
> ritirato un regalo. E i punti rank sono *derivati* da una vista
> materializzata: non esistono come riga da decrementare, e il primo ricalcolo
> cancellerebbe qualunque spesa.

### Come si tiene un saldo che non va sotto zero

`points_ledger` è **in sola aggiunta** ed è la verità. `points_balance` è la
sua somma, mantenuta da un trigger, con un `check (saldo >= 0)`.

Quel CHECK non è ridondante: è ciò che rende impossibile spendere punti che non
si hanno **anche quando due riscatti arrivano insieme**. L'`update` prende un
lock sulla riga, il secondo trova il saldo già ridotto e viene rifiutato. Un
controllo applicativo «ha abbastanza punti?» seguito da un insert sarebbe una
corsa, esattamente come per le prenotazioni.

Stessa forma per le scorte: `check (disponibili >= 0)` più un `select … for
update` sulla riga del premio.

**Un errore si compensa, non si cancella.** Un riscatto rifiutato aggiunge una
riga opposta e rimette il pezzo a catalogo; la riga negativa originale resta.
Un registro che si può riscrivere non spiega più niente.

### Da dove arrivano i punti (migrazione 0024)

**Dalla posizione nella classifica trader del mese**, non dalle metriche del
rank. La 0024 rimuove `points_rules`, `points_accrual` e `matura_punti()`: le
righe già accreditate restano nel registro, perché è storia.

```sql
update public.points_classifica_regole set punti = 600 where posizione = 1;
insert into public.reward_catalog (nome, costo_punti, disponibili) values ('Felpa', 300, null);
```

`assegna_punti_classifica()` è ripetibile: la chiave primaria di
`points_classifica_assegnati` su `(periodo, user_id)` fa sì che la seconda
esecuzione non paghi nulla.

> ⚠️ **Conseguenza da sapere:** chi non fa trading non guadagna più punti da
> solo. Restano i bonus assegnati dall'admin. Se serve premiare anche
> formazione e CRM va aggiunta una seconda sorgente — è una decisione di
> prodotto, non una dimenticanza.

### Perché serve un profit factor minimo

Un podio premiato sul **solo win rate incoraggia il profilo di rischio
sbagliato**: si può vincere il 95% delle volte e perdere soldi, se le poche
operazioni negative sono enormi — niente stop loss, mediare al ribasso. È il
modo più comune di bruciare un conto, e premiarlo pubblicamente lo insegna.

Per questo entrano a podio e prendono punti solo i conti con profit factor
almeno pari alla soglia, di base **1.0**: bisogna quantomeno non perdere.

```sql
update public.trading_config set min_profit_factor = 1.2;   -- più selettivo
update public.trading_config set min_profit_factor = 0;     -- filtro spento
```

### Chi può creare punti dal nulla

Solo l'**admin**, con `assegna_bonus()`, e il motivo è obbligatorio: un punto
senza spiegazione non si può contestare. I leader **no**, di proposito — chi
può creare punti per la propria squadra può gonfiarne i risultati. È una scelta
di prodotto, non un limite tecnico: va rivista consapevolmente se servirà.

Nessuna tabella dei punti ha policy di scrittura: si passa dalle funzioni. Una
`insert` diretta su `points_ledger` significherebbe potersi regalare punti.

## La mappa degli iscritti (migrazione 0025)

Quante persone ci sono in ogni regione. Sembra innocuo, e quasi lo è.

### Il problema dei numeri piccoli

**«Molise: 1» non è una statistica: è una persona.** Chiunque nella rete sappia
che Tizio è molisano ha appena scoperto che è l'unico iscritto lì, e ogni altro
dato regionale che aggiungessimo in futuro parlerebbe di lui.

Per questo `mappa_iscritti()` restituisce **NULL** sotto la soglia (5 di
default), e la soppressione avviene **nel database**: nasconderlo
nell'interfaccia lascerebbe comunque arrivare il numero vero sul telefono.

`NULL` non è `0`. Zero direbbe «lì non c'è nessuno», che è un'altra
informazione e per giunta falsa. L'app colora comunque la regione — si vede che
c'è qualcuno — senza dire quanti.

### E il problema della sottrazione

Sopprimere una cella e mostrare il totale generale è inutile: si ricava per
differenza. Per questo `riepilogo_mappa()` restituisce il totale delle **sole
regioni mostrate**, più quante regioni sono nascoste — mai la loro somma.

```sql
select * from public.mappa_iscritti();      -- soglia 5
select * from public.mappa_iscritti(10);    -- più prudente
select * from public.riepilogo_mappa();
```

Entrambe sono `SECURITY DEFINER` perché un collaboratore vede solo il proprio
profilo: per contare tutti bisogna scavalcare la RLS. Il che è accettabile solo
restituendo **conteggi e nient'altro** — nessun id, nessun nome, nessuna riga.

### La regione

`profiles.regione` è **facoltativa** e la imposta il diretto interessato
(`profiles_update` della 0001 lo consente già; `protect_profile_privileged_columns()`
protegge ruolo e gerarchia, non questo campo). Il CHECK tiene l'elenco chiuso
alle 20 regioni ufficiali: senza, la mappa si riempirebbe di «lombardia»,
«Lombardia » e «LOMBARDIA».

### I contorni

Vengono da **`@svg-maps/italy`** (114 kB, dati ISTAT, licenza **CC-BY-4.0**):
20 percorsi SVG in un riquadro 610 × 793. I nomi del pacchetto sono in inglese
(«Lombardy», «Apulia», «Aosta Valley») e la traduzione ai 20 nomi ufficiali sta
in un posto solo, `src/lib/mappa.ts`. Un test verifica che l'elenco tradotto
coincida esattamente con quello del CHECK: se il pacchetto rinominasse una
regione, il test cade prima che la mappa si ritrovi un buco muto.

Zoom e trascinamento spostano il **`viewBox`** invece di applicare una
trasformazione: così i contorni restano vettoriali a qualunque ingrandimento —
con `scale`, a 6× la Sicilia sarebbe una macchia sfocata.

> **Attribuzione.** CC-BY-4.0 richiede di citare la fonte. La citazione va messa
> nei crediti dell'app prima della pubblicazione sugli store:
> *Mappa dell'Italia — [svg-maps](https://github.com/VictorCazanave/svg-maps),
> CC-BY-4.0.*

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

## Trading MT5 (MetaApi, read-only)

Integrazione **in sola lettura** via [MetaApi.cloud](https://metaapi.cloud): l'utente collega il
conto con la **investor password** (mai la master). La password passa dalla Edge Function a MetaApi
e **non** viene salvata (si memorizza solo il `metaapi_account_id`).

1. Applica la migrazione [`0008_trading.sql`](migrations/0008_trading.sql) (estende `trading_accounts` e `trades`).
2. Crea un account su MetaApi e imposta il token come secret:

   ```bash
   supabase secrets set METAAPI_TOKEN=...
   ```

3. Deploy delle function:

   ```bash
   supabase functions deploy mt5-connect
   supabase functions deploy mt5-sync
   ```

4. In app (sezione **Trading**, pilastro ♠): «Collega MT5» → login, server, investor password →
   `mt5-connect` provisiona e fa il deploy dell'account. Dopo qualche istante usa «Sincronizza»
   (`mt5-sync`): aggiorna saldo/equity e importa i deal in `trades`. Il **rendimento è in percentuale**,
   mai importi garantiti. Endpoint MetaApi in [`functions/_shared/metaapi.ts`](functions/_shared/metaapi.ts).

> La sincronizzazione periodica si può schedulare come per i reminder rinnovi (pg_cron → `mt5-sync`).
