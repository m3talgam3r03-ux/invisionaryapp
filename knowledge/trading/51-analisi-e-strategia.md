---
title: Analisi tecnica, fondamentale e costruzione di una strategia
domain: trading
tags: [trading, analisi tecnica, strategia, backtest]
---

> Contenuto educativo. Descrive strumenti di analisi, non fornisce segnali né previsioni. Nessuna indicazione operativa su strumenti finanziari.

## Cosa è e cosa non è l'analisi tecnica

L'analisi tecnica studia prezzo e volumi per formulare ipotesi **probabilistiche** sul comportamento futuro. Non prevede: ordina le probabilità. Chi la usa come strumento di previsione resta sorpreso ogni volta che il mercato fa altro, che è spesso.

Il valore reale di un'analisi non sta nell'indovinare la direzione: sta nel definire in anticipo un punto di invalidazione, cioè il livello oltre il quale l'ipotesi è sbagliata e l'operazione va chiusa. Un'analisi senza punto di invalidazione non è utilizzabile.

## Concetti di lettura del mercato

**Struttura di mercato.** La successione di massimi e minimi definisce se il prezzo sta salendo, scendendo o muovendosi lateralmente. È la lettura di base: molte strategie complesse non fanno altro che formalizzare questa osservazione.

**Livelli.** Aree in cui in passato il prezzo ha reagito. Sono zone, non linee esatte, e più vengono attraversate meno significano.

**Trend e fasi laterali.** Strumenti e approcci che funzionano in trend spesso falliscono in fase laterale, e viceversa. Riconoscere il contesto conta più della scelta dell'indicatore.

**Volumi.** Danno un'indicazione della partecipazione dietro un movimento. Un movimento ampio con partecipazione scarsa ha una qualità diversa da uno sostenuto.

**Timeframe multipli.** Il grafico ampio dà il contesto, quello stretto il momento operativo. Guardare un solo timeframe è come giudicare una strada dal metro quadrato che si ha davanti.

**Indicatori.** Sono trasformazioni matematiche del prezzo: derivati, non fonti. Aggiungerne molti non aggiunge informazione, aggiunge conferme apparenti dello stesso dato. Due indicatori compresi bene valgono più di sei usati per abitudine.

## Analisi fondamentale e contesto macro

Spiega **perché** il contesto è quello che è: politiche monetarie, tassi di interesse, dati su inflazione e occupazione, risultati aziendali, eventi geopolitici.

Uso pratico principale: il **calendario economico**. Sapere quando sono previsti dati ad alto impatto serve a gestire l'esposizione, perché in quei momenti la volatilità e la differenza tra domanda e offerta possono cambiare in modo brusco. Non serve a prevedere la direzione: le reazioni ai dati sono spesso controintuitive.

## Costruire una strategia

Una strategia è utilizzabile solo se è scritta e se ogni voce è verificabile da un'altra persona:

1. **Mercati e orari** su cui si opera, e quando non si opera.
2. **Contesto richiesto** perché l'operazione sia valida.
3. **Condizione di ingresso**, definita in modo oggettivo.
4. **Punto di invalidazione** (stop), definito prima.
5. **Gestione della posizione**: cosa si fa se va bene, cosa se resta ferma.
6. **Uscita**, in profitto e in perdita.
7. **Rischio per operazione** e limiti giornalieri.
8. **Casi di esclusione**: eventi, giorni, condizioni in cui si sta fermi.

Il test: se la dai a qualcun altro, deve poter prendere le stesse decisioni. Se serve la tua interpretazione, non è una strategia — è un'abitudine.

## Verifica storica e forward test

**Verifica storica (backtest)** — applicare le regole a dati passati. Serve a scartare le idee palesemente non funzionanti. Limiti da conoscere, tutti seri:
- Il senno di poi: sul grafico passato ogni ingresso sembra ovvio.
- L'ottimizzazione eccessiva: più parametri si aggiustano per far tornare i conti sul passato, meno la strategia funzionerà sul futuro.
- Costi reali: spread, commissioni e slippage spesso trasformano un risultato positivo in negativo.

**Forward test** — applicare le stesse regole in avanti, in demo o con dimensioni minime, senza modificarle. È la verifica che conta di più, e richiede tempo.

Un numero ridotto di operazioni non dice nulla in nessuno dei due casi. Servono campioni ampi per distinguere una strategia da una sequenza fortunata.

## Errori ricorrenti

- **Cercare la strategia perfetta** invece di rendere eseguibile una strategia ragionevole. Il problema quasi mai è la strategia.
- **Cambiarla dopo poche operazioni negative.** Ogni strategia ha serie sfavorevoli: cambiare durante una serie significa non testare mai nulla.
- **Aggiungere indicatori dopo una perdita.** La perdita fa parte del metodo, non è un difetto da correggere.
- **Operare senza contesto**, prendendo segnali isolati su un solo timeframe.
- **Ignorare i costi** in fase di valutazione.
- **Confondere l'analisi con la previsione**, e affezionarsi alla propria idea di direzione.

## Cosa non si fa

Non si chiede né si dà una direzione su uno strumento. Non si valuta un'operazione in corso. Non si stimano rendimenti. Le domande del tipo "secondo te sale?" si riportano sul metodo: qual è la tua regola, dov'è il punto di invalidazione, quanto rischi.
