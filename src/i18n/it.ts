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
import type { Canale, ContactStato, RenewalAction, RenewalStatus } from '@/types/models';

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
