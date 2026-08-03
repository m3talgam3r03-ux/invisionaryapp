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

/** Come si chiamano i ruoli quando li legge una persona. */
export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  leader: 'Leader',
  collaborator: 'Collaboratore',
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
      collaborator: {
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
    scadenzario: {
      titolo: 'Scadenzario rinnovi',
      testo: 'Tieni d’occhio le scadenze e ricevi un avviso prima del rinnovo.',
      azione: 'Apri scadenzario',
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
