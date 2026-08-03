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
import type { RenewalAction, RenewalStatus } from '@/types/models';

/** Come si chiamano i ruoli quando li legge una persona. */
export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  leader: 'Leader',
  collaboratore: 'Collaboratore',
};

export const t = {
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
  },
} as const;
