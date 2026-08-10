# Demo Invisionary — anteprima da condividere

[`invisionary-demo.html`](invisionary-demo.html) è un'**anteprima interattiva** dell'app,
in un **unico file** senza dipendenze: si apre con doppio clic, funziona **offline** e non
richiede installazioni, account o connessione a Supabase.

## Come condividerla con i collaboratori

- **File**: mandalo per WhatsApp / email / Drive. Si apre nel browser del telefono o del PC.
- **Link**: la stessa anteprima è pubblicata come artifact — comodo se preferisci non girare un file.

> Su alcune app di messaggistica un `.html` viene bloccato o aperto in anteprima: in quel caso
> conviene metterlo su Drive/OneDrive e condividere il link, oppure usare il link dell'artifact.

## Cosa si può provare

| Sezione | Interazione reale nella demo |
| --- | --- |
| Login | Accedi → dashboard (selettore **ruolo** in alto: admin / leader / collaboratore) |
| Permessi | Cambiando ruolo cambia davvero l'app: il **collaboratore** non vede Scadenzario, pannello Admin né classifica di rete, e trova i **quattro pilastri in cima**; il **leader** vede sé e i propri collaboratori; l'**admin** vede il CRM di **tutta la rete** con un selettore per isolare la singola persona |
| Navigazione | **Barra in basso** con Home e i quattro pilastri ♠♥♦♣ — gli stessi quattro assi dell'iride del logo. Più il pulsante **Indietro** e il **menu a tendina** (☰) per le sezioni che non stanno nella barra |
| Agente AI | **Scrivi e invia**: risponde su vendita, marketing, network, investimenti e trading; fuori tema rifiuta. Mostra le **aree di competenza** attivate e le fonti |
| Agente AI — voce | **Reale, non simulata**: «▶ Ascolta» legge la risposta in italiano, «🔊 Lettura» le legge tutte, 🎤 detta la domanda (Chrome/Edge) |
| Trading ♠ | **Grafico dell'andamento** in %, KPI (operazioni, % in utile), elenco operazioni. **Collega MT5** (login/server/investor password), **Sincronizza** |
| Classifica trader | È qui che stanno **podio e punti**, perché è qui che si vincono. Ordinata sulla **quota di operazioni in utile**, mai su importi o rendimenti. In cima il **podio del mese chiuso** (primo al centro e più in alto), poi il tuo saldo con «Riscatta», e su ogni riga **quanti punti porta a casa quella posizione**. Sotto, chi non ha ancora le 20 operazioni minime: mostrato ma fuori classifica |
| Dashboard | **Azioni del giorno** calcolate sui contatti veri (follow-up in ritardo, appuntamenti, nuovi da qualificare): ogni voce apre il CRM **già filtrato**. Anello del rank e tre KPI |
| Rubrica | **Aggiungi dalla rubrica**: l'app legge i contatti del telefono e li mostra, ma **scegli tu chi importare** — nella rubrica ci sono anche il medico e i familiari. Chi è già nel CRM non è selezionabile. I contatti aggiunti nascono **senza consensi**, quindi non contattabili |
| Importazione | **Dichiarazione obbligatoria** prima di importare: da dove arrivano i dati e con quale base giuridica. Il pulsante resta spento finché non ci sono entrambe. Segnala anche i **duplicati**: il confronto è su email e telefono normalizzati, così «+39 340 123 4567» e «3401234567» sono riconosciuti come la stessa persona |
| Privacy | Nella scheda contatto, **consensi per canale** (email · SMS · WhatsApp · telefono): tre stati e non due — sì, no, e **«mai chiesto»**, che vale come un no. Nell'app un contatto senza consenso attivo non entra negli invii, e a impedirlo è il database |
| Network ♥ | **52 contatti**: ricerca istantanea (nome, email, telefono, prodotto) con evidenziazione, filtri per **fase della trattativa**, filtro **⚠ Da ricontattare**, ordinamento A→Z / attività / stato, indice alfabetico. La scheda contatto ha azioni rapide, cambio di fase e **storico dei passaggi** — mostra *come* ci è arrivato, non solo dov'è: «Appuntamento → Perso» dice molto più di «Perso». **+ Nuovo** aggiunge davvero; **Importa** CSV/Excel |
| Scadenzario | Rinnovi raggruppati per urgenza (scaduti / 7 / 30 giorni / oltre), con KPI in testa. Su scaduti e urgenti c'è **✓ Rinnova**: un tocco e la scadenza va a **+30 giorni**, la riga cambia gruppo da sola. Toccando la riga si aprono anche **+60 / +3 mesi / +6 mesi / +1 anno** e la **data manuale** dal calendario (le date passate vengono rifiutate) |
| Formazione ♦ | Corsi con **anello di avanzamento**, lezione → video, calendario, avanzamento della rete |
| Calcolatori | **Calcolo reale**. Lottaggio: risultato in evidenza, **semaforo del rischio** (prudente → molto alto) e presetti 0,5/1/2%, sui **20 strumenti** veri dell'app (forex, indici, metalli). La **conversione della valuta** è mostrata invece che nascosta — è il punto in cui si sbaglia: su GBP/USD un pip vale 10 USD, e con un conto in EUR quei 10 USD vanno convertiti. Il cambio arriva dalla cache con l'indicazione di **quanto è vecchio**; se manca, l'app lo dice e **lo chiede**, non lo inventa. I lotti sono arrotondati **per difetto** al passo del broker: eccedere il rischio deciso è l'unico errore da non fare. Interesse composto: il campo del rendimento nasce **vuoto** — un valore preimpostato sarebbe l'app che promette un rendimento, e non lo facciamo da nessuna parte. **Grafico ad aree impilate** che separa quello che hai versato da quello che hanno fatto gli interessi (una curva sola farebbe sembrare che tutta la crescita venga dal composto), e ti dice **da che anno** gli interessi superano il versato. Tabella anno per anno con le tre colonne |
| Appuntamenti | **Prenota davvero**: scegli con chi (ognuno ha la propria agenda) e tocca un orario. Vedi **solo gli orari liberi** — chi prenota non sa con chi sono gli altri appuntamenti del suo leader. Prova a toccare due volte lo stesso orario: l'app dice *«qualcuno l'ha preso un attimo prima»*, perché nell'app vera a rifiutare la seconda prenotazione è il **database**, non l'interfaccia. E non puoi prenotare due call alla stessa ora con persone diverse. Leader e admin hanno **La tua disponibilità**: pubblichi le fasce e vedi *prima di salvare* quanti appuntamenti generano e quanti minuti restano fuori. **Al calendario** scarica un vero file `.ics` che si apre in Google Calendar o Apple Calendar |
| Punti e premi | Il **catalogo**: qui si spendono i punti vinti in classifica. Sono una **valuta a parte dal rank** — riscattare un premio non fa scendere il tuo livello. Riscatta dal catalogo e guarda il **registro**: la spesa è una riga negativa, e se un riscatto viene **rifiutato** i punti tornano con una riga *opposta* — quella vecchia resta. Un registro che si può riscrivere non spiega più niente. I premi esauriti restano esauriti anche per chi ha punti da vendere |
| La rete in Italia | **Mappa vera**, coi contorni reali di coste e regioni, in mezzo al mare: nomi dei mari, rosa dei venti, paralleli e ombra della terra sull'acqua. Ogni regione porta il **numero degli iscritti** su una pastiglia; i nomi delle regioni compaiono **ingrandendo**, come su qualunque mappa — a tutta Italia venti etichette si sovrapporrebbero. Tocca una regione per la scheda, **trascina** per spostarti, **+ / −** per ingrandire (fino a 6×, e resta nitida perché è vettoriale). Ogni regione è colorata in base a quanti iscritti ha. Guarda **Molise**: è colorato ma il numero non c'è — ha meno di 5 iscritti, e «Molise: 1» non è una statistica, è una persona. Guarda **Sardegna**: grigia, lì davvero non c'è nessuno. La distinzione è il punto della schermata. Il totale in fondo somma **solo le regioni mostrate**: dare il totale generale permetterebbe di ricavare per differenza quelle nascoste. Sotto scegli la tua regione — facoltativa, e si toglie ritoccandola |
| Rank | Rank a carte (2 → Asso) con **anello di avanzamento** e scomposizione dei punti, più la classifica |
| Condivisione | Sotto il rank, la **card per le Storie**. Prova a scrivere «ho fatto 3.000 € questo mese» nella didascalia: il pulsante si spegne e ti dice *quale* parola è il problema. La card esce dall'app col marchio sopra, quindi quello che ci scrivi diventa comunicazione dell'azienda — importi, guadagni, garanzie ed email non passano. Le metriche di **trading non si condividono affatto**: dentro la rete un win rate è un dato, su un social è una promessa |
| Community ♣ | Feedback della squadra |
| Admin | Gestione ruoli e gerarchia (visibile solo col ruolo admin) |

## Cosa NON è

È un'anteprima di **interfaccia e flussi**, non l'app compilata:

- i dati sono d'esempio e **non vengono salvati** (ricaricando la pagina si riparte da capo);
- l'agente AI usa risposte **precaricate**; nell'app vera risponde **Claude** tramite la
  Edge Function `ai-chat`, con la base di conoscenza della rete (RAG);
- MT5, import file e notifiche push sono **simulati**.

Per l'app reale con dati veri: [`../DEPLOY.md`](../DEPLOY.md).

## Aggiornarla

Il file è generato a partire dal frammento usato per l'anteprima online; se lo modifichi,
ricordati che `<head>`, `charset` e viewport stanno **solo** in questo file autonomo.

---

Contenuti a scopo **educativo e informativo**. Nessuna promessa di rendimento, nessuna
consulenza finanziaria personalizzata. Dati CRM = dati personali (GDPR, storage EU).
