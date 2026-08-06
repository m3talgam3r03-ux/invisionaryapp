/**
 * Testi dell'interfaccia, in italiano.
 *
 * Regola: nessuna stringa visibile all'utente va scritta dentro un componente.
 * Il file cresce a ogni milestone con le schermate che vengono toccate — non è
 * stato riempito in un colpo solo per non riscrivere l'intera app in una volta.
 *
 * Le etichette dei ruoli sono tipizzate su `Role`: se un domani cambia l'insieme
 * dei ruoli, TypeScript segnala qui le voci mancanti.
 */
import type { Role } from '@/theme';
import type {
  BaseGiuridica,
  Canale,
  ContactStato,
  RenewalAction,
  RenewalStatus,
} from '@/types/models';

/** Come si chiamano i ruoli quando li legge una persona. */
export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  leader: 'Leader',
  collaboratore: 'Collaboratore',
};

export const t = {
  /** Etichette della barra in basso: corte, stanno sotto un'icona. */
  nav: {
    home: 'Home',
    trading: 'Trading',
    network: 'Network',
    formazione: 'Formazione',
    community: 'Community',
  },

  comune: {
    caricamento: 'Caricamento…',
    caricamentoProfilo: 'Caricamento profilo…',
    senzaNome: 'Senza nome',
    errore: 'Errore nel caricamento.',
    esci: 'Esci',
    salva: 'Salva',
  },

  dashboard: {
    saluto: (nome: string) => `Ciao, ${nome}`,
    benvenuto: 'Benvenuto',
    /** Il riquadro che cambia in base al ruolo di chi guarda. */
    perRuolo: {
      admin: {
        titolo: 'Pannello amministratore',
        testo: 'Gestione utenti, ruoli e autorizzazioni della rete.',
        azione: 'Apri pannello admin',
      },
      leader: {
        titolo: 'La mia rete',
        testo: 'Qui vedrai i tuoi collaboratori, i loro rinnovi e l’avanzamento formazione.',
        azione: null,
      },
      collaboratore: {
        titolo: 'Il mio spazio',
        testo: 'Clienti, rinnovi e formazione: tutto in un unico posto.',
        azione: null,
      },
    } satisfies Record<Role, { titolo: string; testo: string; azione: string | null }>,
    agente: {
      titolo: 'Agente AI',
      testo: 'Chiedi all’assistente: risposte basate sui contenuti della piattaforma.',
      azione: 'Apri l’agente',
    },
    /** Per il collaboratore la sezione è «i miei rinnovi»: la rete non la vede. */
    scadenzario: {
      titolo: 'Scadenzario della rete',
      testo: 'Le scadenze della rete, con le richieste da approvare in cima.',
      azione: 'Apri scadenzario',
    },
    scadenzarioMio: {
      titolo: 'I miei rinnovi',
      testo: 'Le tue scadenze e un avviso prima che arrivino.',
      azione: 'Apri i miei rinnovi',
    },
    calcolatori: {
      titolo: 'Calcolatori',
      testo: 'Lottaggio e interesse composto — strumenti a scopo educativo.',
      azione: 'Apri calcolatori',
    },
    calendario: {
      titolo: 'Appuntamenti',
      testo: 'Prenota una call col tuo leader scegliendo fra i suoi orari liberi.',
      azione: 'Apri il calendario',
    },
    premi: {
      titolo: 'Punti e premi',
      testo: 'I punti che accumuli lavorando si riscattano a catalogo. Non toccano il rank.',
      azione: 'Apri il catalogo',
    },
    rank: {
      titolo: 'Rank & classifica',
      testo: 'Il tuo avanzamento nella rete: diventa un Asso.',
      azione: 'Vedi il tuo rank',
    },
    pilastroApri: 'Apri →',
    pilastroInArrivo: 'In arrivo',
    disclaimer:
      'Contenuti a scopo educativo e informativo. Nessuna promessa di rendimento né consulenza finanziaria personalizzata.',
  },

  admin: {
    introElenco:
      'Assegna ruoli e gerarchia. I nuovi utenti si registrano come collaboratori; creazione ed eliminazione account avvengono da Supabase.',
    caricamentoUtenti: 'Caricamento utenti…',
    nessunUtente: 'Nessun utente.',
    leaderDi: (nome: string) => `Leader: ${nome}`,
    leaderNonAssegnato: 'non assegnato',
    utenteNonTrovato: 'Utente non trovato.',
    staiModificandoTe: 'Stai modificando il tuo profilo.',
    campoRuolo: 'Ruolo',
    campoLeader: 'Leader',
    nessunLeader: '— Nessuno',
    nessunLeaderDisponibile:
      'Nessun leader disponibile: assegna prima il ruolo «Leader» a un utente.',
    salvataggioFallito: 'Salvataggio non riuscito.',
  },

  crm: {
    titolo: 'Contatti',
    nuovo: '+ Nuovo contatto',
    importa: 'Importa',
    cerca: 'Cerca nome, contatto o prodotto',
    caricamento: 'Caricamento contatti…',
    nessuno: 'Nessun contatto',
    nessunoSuggerimento: 'Aggiungi il primo contatto o importa una lista.',
    nessunRisultato: 'Nessun contatto con questi filtri.',
    azzeraFiltri: 'Azzera i filtri',
    tutti: 'Tutti',
    fermoDa: (g: number) => `Fermi da ${g}+ giorni`,
    maiContattato: 'Mai contattato',
    ultimoContatto: (quando: string) => `Ultimo contatto: ${quando}`,

    stato: {
      nuovo: 'Nuovo',
      contattato: 'Contattato',
      appuntamento: 'Appuntamento',
      cliente: 'Cliente',
      perso: 'Perso',
    } satisfies Record<ContactStato, string>,

    importa2: 'Importa',
    importaSchermata: {
      dichiarazione: 'Dichiarazione obbligatoria',
      dichiarazioneSpiega:
        'Prima di importare va dichiarato da dove arrivano questi dati e con quale base li tratti. È la sola cosa che si può esibire se qualcuno chiede perché quei contatti sono nel sistema.',
      origineDati: 'Da dove arrivano *',
      origineDatiEsempio: 'es. evento del 12 marzo, rubrica personale, modulo sul sito',
      baseGiuridica: 'Base giuridica *',
      basi: {
        consenso: 'Consenso',
        contratto: 'Contratto',
        obbligo_legale: 'Obbligo legale',
        legittimo_interesse: 'Legittimo interesse',
      } satisfies Record<BaseGiuridica, string>,
      mancaDichiarazione: 'Compila origine e base giuridica per poter importare.',
      importaN: (n: number) => `Importa ${n} ${n === 1 ? 'contatto' : 'contatti'}`,
      duplicatiTrovati: (n: number) =>
        `${n} ${n === 1 ? 'riga è già' : 'righe sono già'} in lista e non ${n === 1 ? 'verrà reimportata' : 'verranno reimportate'}.`,
    },

    rubrica: {
      titolo: 'Dalla rubrica',
      apri: 'Aggiungi dalla rubrica',
      spiega:
        'L’app legge la rubrica del telefono e ti mostra chi c’è. Scegli tu chi aggiungere: nessun contatto viene copiato senza la tua selezione.',
      avvisoPrivacy:
        'Nella rubrica ci sono anche persone che non c’entrano col lavoro. Aggiungi solo chi ha davvero senso avere nel CRM: entreranno senza consensi, quindi non contattabili finché non li registri tu.',
      leggi: 'Leggi la rubrica',
      lettura: 'Lettura della rubrica…',
      nonDisponibile: 'Rubrica non disponibile',
      nonDisponibileSpiega:
        'Serve l’app installata sul telefono: nel browser e in Expo Go la rubrica non è accessibile.',
      permessoNegato: 'Permesso negato',
      permessoNegatoSpiega:
        'Senza accesso alla rubrica non c’è nulla da mostrare. Puoi concederlo dalle impostazioni del telefono.',
      vuota: 'Nessun contatto utilizzabile',
      vuotaSpiega: 'Servono almeno un’email o un numero di telefono per poter aggiungere qualcuno.',
      trovati: (n: number) => `${n} contatti nella rubrica`,
      selezionati: (n: number) => `${n} selezionati`,
      selezionaTutti: 'Seleziona tutti',
      deselezionaTutti: 'Deseleziona',
      giaInLista: 'Già nel CRM',
      cerca: 'Cerca nella rubrica',
      aggiungi: (n: number) => `Aggiungi ${n} ${n === 1 ? 'contatto' : 'contatti'}`,
      fatto: (n: number) => `${n} ${n === 1 ? 'contatto aggiunto' : 'contatti aggiunti'}`,
      origineDati: 'Rubrica del telefono',
    },

    esporta: {
      titolo: 'Esporta contatti',
      spiega: 'CSV con i consensi inclusi: senza, la lista non è utilizzabile da chi la riceve.',
      azione: 'Esporta in CSV',
      fatto: (n: number) => `${n} contatti esportati`,
    },

    campoStato: 'Fase',
    campoTag: 'Tag',
    campoOrigine: 'Origine',
    origineManuale: 'Inserito a mano',
    origineImport: 'Importato',

    storico: {
      titolo: 'Storico',
      vuoto: 'Nessun passaggio registrato.',
      creato: (stato: string) => `Creato come «${stato}»`,
      passaggio: (da: string, a: string) => `${da} → ${a}`,
    },

    consensi: {
      titolo: 'Consensi',
      sottotitolo:
        'Ogni canale è una decisione separata. Senza consenso attivo il contatto non entra negli invii: lo impedisce il database, non solo questa schermata.',
      canale: {
        email: 'Email',
        sms: 'SMS',
        whatsapp: 'WhatsApp',
        telefono: 'Telefono',
      } satisfies Record<Canale, string>,
      concesso: 'Sì',
      negato: 'No',
      nonRegistrato: 'Non registrato',
      spiegaNonRegistrato: 'Mai chiesto: vale come un no.',
      informativa:
        'Autorizzo Invisionary a contattarmi su questo canale per comunicazioni relative ai prodotti e ai servizi della rete. Posso revocare il consenso in qualsiasi momento.',
      storicoTitolo: 'Storico dei consensi',
      storicoVuoto: 'Nessun consenso ancora registrato.',
      dato: (canale: string) => `${canale}: consenso dato`,
      revocato: (canale: string) => `${canale}: consenso revocato`,
      soloProprietario: 'Solo chi possiede il contatto può registrarne i consensi.',
    },

    privacy: {
      titolo: 'Dati personali',
      esporta: 'Esporta i dati',
      esportaFatto: 'Dati esportati',
      esportaSpiega: 'Tutto ciò che è registrato su questa persona, in un file.',
      cancella: 'Cancella tutti i dati',
      cancellaSpiega:
        'Elimina il contatto e tutto ciò che vi è collegato: consensi, storico, rinnovi. Resta solo la traccia dell’avvenuta cancellazione, senza i dati.',
      cancellaConferma:
        'Cancellare definitivamente questa persona e tutti i suoi dati? L’operazione non si annulla.',
      cancellaFatto: 'Dati cancellati',
    },
  },

  rinnovi: {
    titoloMiei: 'I miei rinnovi',
    titoloRete: 'Scadenzario della rete',
    sottotitoloMiei: 'Le tue scadenze. Le modifiche passano dall’approvazione del tuo leader.',
    sottotitoloRete: 'Le scadenze della rete, con le richieste da approvare in cima.',
    nuovo: '+ Nuovo rinnovo',
    caricamento: 'Caricamento scadenzario…',
    erroreElenco: 'Impossibile caricare i rinnovi',
    nessuno: 'Nessun rinnovo',
    nessunoSuggerimento: 'Aggiungi una scadenza per iniziare a monitorarla.',
    daApprovare: 'Da approvare',
    inScadenza: 'In scadenza',
    resto: 'Tutti gli altri',
    nonTrovato: 'Rinnovo non trovato.',

    stato: {
      attivo: 'Attivo',
      in_attesa_approvazione: 'In attesa di approvazione',
      scaduto: 'Scaduto',
      annullato: 'Annullato',
    } satisfies Record<RenewalStatus, string>,

    urgenza: {
      scadutoDa: (g: number) => `Scaduto da ${g} ${g === 1 ? 'giorno' : 'giorni'}`,
      scadeOggi: 'Scade oggi',
      tra: (g: number) => `Tra ${g} ${g === 1 ? 'giorno' : 'giorni'}`,
    },

    approva: {
      titolo: 'Rinnova',
      inAttesa: 'Questo rinnovo attende la tua approvazione.',
      inAttesaAltri: 'In attesa di approvazione dal tuo leader.',
      richiestoIl: (data: string) => `Richiesto il ${data}`,
      unPeriodo: (data: string, giorni: number) => `+${giorni} giorni → ${data}`,
      recupero: (data: string) => `Recupera fino a ${data}`,
      spiegaRitardo: (periodi: number) =>
        `Questa scadenza è arretrata di ${periodi} periodi: «+1 periodo» la lascerebbe ancora nel passato. Scegli tu quale data usare.`,
      spiegaSomma: 'La nuova scadenza parte dalla scadenza precedente, non da oggi: così un’approvazione in ritardo non fa perdere giorni.',
      conferma: 'Approva rinnovo',
      nonAutorizzato: 'Solo il leader del proprietario, o un amministratore, può approvare.',
    },

    storico: {
      titolo: 'Storico',
      vuoto: 'Nessuna modifica registrata.',
      azione: {
        creato: 'Creato',
        rinnovo_richiesto: 'Rinnovo richiesto',
        approvato: 'Approvato',
        rifiutato: 'Rifiutato',
        data_modificata: 'Data modificata',
        annullato: 'Annullato',
      } satisfies Record<RenewalAction, string>,
      da: (vecchia: string, nuova: string) => `${vecchia} → ${nuova}`,
    },

    form: {
      salva: 'Salva modifiche',
      crea: 'Crea rinnovo',
      elimina: 'Elimina rinnovo',
      eliminaConferma: 'Eliminare definitivamente il rinnovo?',
      salvataggioFallito: 'Salvataggio non riuscito.',
      creazioneFallita: 'Creazione non riuscita.',
      avvisoRichiesta:
        'Salvando, la modifica va in approvazione al tuo leader: la scadenza cambia solo dopo il suo via libera.',
    },
  },

  rank: {
    tuoRank: 'Il tuo rank',
    calcolo: 'Calcolo del rank…',
    punti: (n: number) => `${n} ${n === 1 ? 'punto' : 'punti'}`,
    massimo: 'Sei un Asso — livello massimo della scala.',
    prossimo: (nome: string, mancanti: number) =>
      `Prossimo: ${nome} · ${mancanti} ${mancanti === 1 ? 'punto' : 'punti'} al traguardo.`,
    classifica: 'Classifica della rete',
    caricamentoClassifica: 'Caricamento classifica…',
    io: ' · tu',
    comeSiCalcola: 'Come si calcola',
    metriche: {
      lezioni_completate: 'Lezioni completate',
      clienti_acquisiti: 'Clienti acquisiti',
      clienti_attivi: 'Clienti attivi',
      rinnovi_attivi: 'Rinnovi attivi',
    },
    pesoNullo: 'non conteggiata',
    disclaimer:
      'Avanzamento a scopo motivazionale. Nessuna promessa di rendimento né di risultati economici.',
  },

  trading: {
    classifica: {
      titolo: 'Classifica trader',
      sottotitolo: 'Ordinata sulla quota di operazioni chiuse in utile del mese in corso.',
      caricamento: 'Caricamento classifica…',
      vuota: 'Nessun trader da classificare.',
      winRate: 'operazioni in utile',
      operazioni: (n: number) => `${n} ${n === 1 ? 'operazione' : 'operazioni'}`,
      nonClassificati: 'Non ancora in classifica',
      sogliaSpiegazione: (min: number) =>
        `Servono almeno ${min} operazioni nel mese per entrare in classifica: poche operazioni non dicono nulla sul metodo.`,
      vipHost: 'Call VIP',
      podio: 'Podi dei mesi scorsi',
      podioVuoto: 'Nessun mese ancora chiuso.',
      posizione: (n: number) => `${n}°`,
      /** Il disclaimer non è opzionale e non va nascosto. */
      disclaimer:
        'Solo conti collegati in sola lettura. La classifica mostra la quota di operazioni in utile, mai importi né rendimenti: i risultati di altri non sono risultati ottenibili. Contenuti a scopo educativo, non consulenza finanziaria.',
    },
  },

  lottaggio: {
    titolo: 'Lottaggio',
    strumento: 'Strumento',
    caricamentoStrumenti: 'Caricamento strumenti…',
    equity: 'Saldo del conto',
    valutaConto: 'Valuta del conto',
    rischio: 'Rischio %',
    stop: (unita: string) => `Stop loss (${unita})`,
    contractOverride: 'Dimensione contratto',
    contractOverrideSpiega:
      'Sugli indici cambia da broker a broker: se il tuo usa un valore diverso, scrivilo qui.',

    risultato: 'Lotti da aprire',
    rischiando: (importo: string, valuta: string) => `Rischiando ${importo} ${valuta}`,
    perditaAlloStop: 'Perdita se lo stop viene toccato',
    valorePip: (unita: string) => `Valore ${unita} per lotto`,
    unitaTotali: 'Unità',
    sottoMinimo: 'Sotto il lotto minimo: riduci lo stop o aumenta il capitale.',

    conversione: 'Conversione valuta',
    conversioneSpiega: (quote: string, conto: string, unita: string) =>
      `Il valore del ${unita} nasce in ${quote} e va convertito in ${conto}: senza, rischieresti una cifra diversa da quella decisa.`,
    stessaValuta: 'Quotazione e conto nella stessa valuta: nessuna conversione necessaria.',
    cambioMancante:
      'Cambio non disponibile. Il calcolo userebbe un valore inventato: inseriscilo a mano o riprova più tardi.',
    cambioManuale: 'Cambio manuale',
    cambioAMano: (quote: string, tasso: string, conto: string) =>
      `Cambio inserito a mano: 1 ${quote} = ${tasso} ${conto}`,

    incompleto: 'Compila i campi per vedere il risultato.',
    disclaimer:
      'Stima a scopo educativo, non consulenza finanziaria. Le convenzioni su dimensione del contratto e valore del pip variano fra broker: verifica sempre col tuo.',
  },

  composto: {
    titolo: 'Interesse composto',
    capitale: 'Capitale iniziale (€)',
    versamento: 'Versamento mensile (€)',
    tasso: 'Tasso annuo %',
    anni: 'Per quanti anni',

    // Il campo del tasso nasce vuoto: un valore preimpostato sarebbe l'app che
    // suggerisce un rendimento, e non lo facciamo da nessuna parte.
    tassoAiuto:
      'Nessun rendimento è preimpostato: l’ipotesi la scegli tu. Il tasso è nominale annuo con capitalizzazione mensile — scrivendo 6 il rendimento effettivo è 6,17%.',
    tassoMancante: 'Inserisci l’ipotesi di rendimento per vedere la proiezione.',

    montante: 'Montante finale',
    versato: 'Versato da te',
    interessi: 'Generato dagli interessi',
    quotaInteressi: (percento: string) =>
      `Gli interessi sono il ${percento}% del totale: il resto sono soldi che hai messo tu.`,

    andamento: 'Come ci si arriva',
    legendaVersato: 'Versato',
    legendaInteressi: 'Interessi',
    sorpasso: (anno: number) =>
      `Dall’anno ${anno} gli interessi superano quanto hai versato in quell’anno.`,
    nessunSorpasso:
      'In questo periodo il versato resta la parte più grande: il composto ha bisogno di tempo.',

    annoPerAnno: 'Anno per anno',
    colonnaAnno: 'Anno',
    colonnaVersato: 'Versato',
    colonnaInteressi: 'Interessi',
    colonnaTotale: 'Totale',

    incompleto: 'Compila i campi con valori validi (anni fra 1 e 100).',
    disclaimer:
      'Proiezione a scopo educativo, non consulenza finanziaria. Il rendimento è un’ipotesi tua, non una previsione né una garanzia: i mercati non salgono a percentuale costante e il capitale può diminuire. La proiezione non tiene conto di inflazione, imposte e costi.',
  },

  calendario: {
    titolo: 'Appuntamenti',
    disponibilita: 'La tua disponibilità',

    conChi: 'Con chi',
    quando: 'Quando',
    nessunHost: 'Non c’è ancora nessuno con cui prenotare.',
    nessunoSlot: 'Nessun orario libero nelle prossime tre settimane.',
    caricamentoSlot: 'Cerco gli orari liberi…',
    prenota: 'Prenota',
    prenotato: 'Appuntamento preso.',

    mieiAppuntamenti: 'I tuoi appuntamenti',
    nessunAppuntamento: 'Nessun appuntamento in programma.',
    conNome: (nome: string) => `Con ${nome}`,
    annulla: 'Annulla',
    annullata: 'Annullata',
    passato: 'Già passato',
    aggiungiAlCalendario: 'Al calendario',
    erroreCalendario: 'Non è stato possibile creare il file per il calendario.',

    // Il messaggio che conta: non è un errore dell'utente, è una corsa persa.
    slotOccupato: 'Qualcuno ha preso questo orario un attimo prima. Ne ho ricaricati altri.',
    slotNonDisponibile: 'Questo orario non è più fra quelli disponibili.',
    erroreGenerico: 'Non è stato possibile prenotare. Riprova.',

    fusoDiverso: (fuso: string) =>
      `Gli orari sono nel fuso del tuo telefono. Chi ospita è su ${fuso}: controlla prima di confermare.`,

    // Disponibilità
    giorni: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
    giorniBrevi: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
    dalle: 'Dalle',
    alle: 'Alle',
    durata: 'Durata (minuti)',
    aggiungiFascia: 'Aggiungi fascia',
    nessunaFascia: 'Non hai ancora pubblicato nessuna disponibilità.',
    fasciaDescrizione: (inizio: string, fine: string, durata: number) =>
      `${inizio}–${fine} · appuntamenti da ${durata} min`,
    anteprimaSlot: (quanti: number) =>
      `${quanti} ${quanti === 1 ? 'appuntamento' : 'appuntamenti'} da questa fascia`,
    anteprimaAvanzo: (minuti: number) => `, e ${minuti} min che restano fuori`,
    rimuovi: 'Rimuovi',
    rimuoviAvviso:
      'Togliere una fascia non annulla gli appuntamenti già presi: quelli restano, e si annullano uno per uno.',

    erroreOrario: 'Orario non valido (usa il formato 09:00).',
    erroreFine: 'L’ora di fine deve venire dopo quella di inizio.',
    erroreDurata: 'La durata deve stare fra 5 e 480 minuti.',
    erroreFinestra: 'La fascia è troppo corta per contenere un appuntamento.',

    spiegazione:
      'Pubblica quando sei disponibile: la tua rete vede solo gli orari liberi, mai con chi sono gli altri appuntamenti.',
  },

  premi: {
    titolo: 'Punti e premi',
    saldo: 'I tuoi punti',
    punti: (n: string) => `${n} punti`,

    // La distinzione più importante di tutta la schermata.
    diversiDalRank:
      'I punti premio sono una valuta a parte: riscattare un premio non tocca il tuo rank.',

    obiettivo: 'Il prossimo traguardo',
    mancano: (n: string, premio: string) => `Ti mancano ${n} punti per «${premio}»`,
    tuttoAllaPortata: 'Puoi riscattare tutto quello che c’è a catalogo.',

    catalogo: 'Catalogo',
    catalogoVuoto: 'Non c’è ancora nessun premio a catalogo.',
    riscatta: 'Riscatta',
    costo: (n: string) => `${n} punti`,
    rimasti: (n: number) => (n === 1 ? 'ultimo pezzo' : `${n} pezzi rimasti`),
    senzaLimite: 'sempre disponibile',
    esaurito: 'Esaurito',
    puntiInsufficienti: 'Punti insufficienti',

    riscattato: 'Riscatto inviato: riceverai conferma.',
    erroreEsaurito: 'Qualcuno l’ha riscattato un attimo prima.',
    errorePunti: 'I punti non bastano più: controlla il saldo.',
    erroreGenerico: 'Non è stato possibile completare il riscatto.',

    mieiRiscatti: 'I tuoi riscatti',
    nessunRiscatto: 'Non hai ancora riscattato nulla.',
    stato: {
      richiesta: 'In attesa',
      approvata: 'Approvato',
      consegnata: 'Consegnato',
      rifiutata: 'Rifiutato',
    } as Record<string, string>,

    movimenti: 'Come li hai guadagnati',
    nessunMovimento: 'Nessun movimento: i punti arrivano completando lezioni e acquisendo clienti.',
    origine: {
      maturazione: 'Maturati',
      bonus: 'Bonus',
      riscatto: 'Riscatto',
      rimborso: 'Rimborso',
    } as Record<string, string>,
    metrica: {
      lezioni_completate: 'Lezioni completate',
      clienti_acquisiti: 'Clienti acquisiti',
      clienti_attivi: 'Clienti attivi',
      rinnovi_attivi: 'Rinnovi attivi',
    } as Record<string, string>,

    // Se saldo e registro non coincidono, il registro ha ragione.
    saldoIncoerente:
      'Il saldo non corrisponde ai movimenti. Segnalalo: il registro è la versione giusta.',

    disclaimer:
      'I premi sono riconoscimenti interni alla rete, non compensi né promesse di guadagno.',
  },

  formazione: {
    calendario: 'Calendario',
    avanzamentoRete: 'Avanzamento rete',
    caricamentoCorsi: 'Caricamento corsi…',
    erroreCorsi: 'Impossibile caricare i corsi.',
    erroreCorsiDettaglio: (motivo: string) => `${motivo} — verifica .env e la migrazione 0004.`,
    erroreSconosciuto: 'Errore sconosciuto',
    nessunCorso: 'Nessun corso',
    nessunCorsoSuggerimento:
      'I corsi vengono gestiti dall’amministratore. Puoi caricare il seed dimostrativo.',
    rete: {
      intro: 'Avanzamento formazione della tua rete.',
      nessunMembro: 'Nessun membro della rete da mostrare.',
    },
    avanzamentoGlobale: 'Il tuo avanzamento',
    lezioniSu: (fatte: number, totale: number) => `${fatte} di ${totale} lezioni`,
    completato: 'Completato',
    durata: (min: number) => `${min} min`,
  },
} as const;
