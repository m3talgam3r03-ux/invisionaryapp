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
| Navigazione | Pulsante **Indietro** e **menu a tendina** (☰) con tutte le sezioni |
| Agente AI | **Scrivi e invia**: risponde su vendita, marketing, network, investimenti e trading; fuori tema rifiuta. Mostra le **aree di competenza** attivate e le fonti |
| Agente AI — voce | **Reale, non simulata**: «▶ Ascolta» legge la risposta in italiano, «🔊 Lettura» le legge tutte, 🎤 detta la domanda (Chrome/Edge) |
| Trading ♠ | **Grafico dell'andamento** in %, KPI (operazioni, % in utile), elenco operazioni. **Collega MT5** (login/server/investor password), **Classifica**, **Sincronizza** |
| Dashboard | **Azioni del giorno** calcolate sui contatti veri (follow-up in ritardo, appuntamenti, nuovi da qualificare): ogni voce apre il CRM **già filtrato**. Anello del rank e tre KPI |
| Network ♥ | **52 contatti**: ricerca istantanea (nome, email, telefono, prodotto) con evidenziazione, filtri di stato, filtro **⚠ Da ricontattare**, ordinamento A→Z / attività / stato, indice alfabetico, scheda contatto con azioni rapide e cambio stato. **+ Nuovo** aggiunge davvero; **Importa** CSV/Excel |
| Scadenzario | Rinnovi dei clienti raggruppati per urgenza (scaduti / 7 / 30 giorni / oltre), con KPI in testa |
| Formazione ♦ | Corsi con **anello di avanzamento**, lezione → video, calendario, avanzamento della rete |
| Calcolatori | **Calcolo reale**: lottaggio **per strumento** (EUR/USD, XAU/USD, US30, BTC/USD…) e interesse composto |
| Rank | Rank a carte (2 → Asso) con **anello di avanzamento** e scomposizione dei punti, più la classifica |
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
