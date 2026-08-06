/**
 * Condivisione social dei traguardi — parte pura.
 *
 * PERCHÉ QUESTO FILE È COSÌ SEVERO
 * Una card che esce dall'app e finisce su Instagram non è più un problema di
 * interfaccia: è pubblicità, e per una rete di network marketing è il punto
 * esatto in cui si finisce nei guai. «Ho guadagnato 3.000 € questo mese» postato
 * col logo dell'azienda è una promessa di rendimento fatta dall'azienda, anche
 * se l'ha scritta un collaboratore.
 *
 * Due difese, e servono entrambe:
 *
 * 1. QUELLO CHE VA SULLA CARD È UNA LISTA CHIUSA, non un filtro. `costruisciCard`
 *    accetta solo rank, punti e conteggi di lezioni: importi, percentuali di
 *    guadagno e nomi di clienti non hanno proprio un posto dove entrare.
 *    Un filtro si aggira; una struttura che non prevede il campo, no.
 *
 * 2. IL TESTO LIBERO SI CONTROLLA E SI BLOCCA. Se si lascia scrivere una
 *    didascalia, quella è la falla. `verificaTesto` la chiude.
 *
 * Il trading resta fuori di proposito: anche il win rate, che in classifica è
 * accettabile perché resta dentro la rete, su un social diventa un rendimento
 * sbandierato. Vedi `PERCHE_NIENTE_TRADING`.
 *
 * Modulo puro: nessun import.
 */

export const PERCHE_NIENTE_TRADING =
  'Le metriche di trading non si condividono fuori dall’app: dentro la rete un win rate è un dato, su un social diventa una promessa.';

/** Formato Stories: 1080×1920, con le zone che le app coprono con la loro interfaccia. */
export const STORIES = {
  larghezza: 1080,
  altezza: 1920,
  /** In alto ci vanno avatar e nome dell'account. */
  margineAlto: 250,
  /** In basso ci vanno «Rispondi», adesivi e la barra di sistema. */
  margineBasso: 320,
} as const;

export type TipoCard = 'rank' | 'formazione' | 'costanza';

export type Card = {
  tipo: TipoCard;
  /** Il numero grande. Mai un importo. */
  valore: string;
  titolo: string;
  sottotitolo: string;
  /** Obbligatorio, e non rimovibile da chi condivide. */
  disclaimer: string;
};

const DISCLAIMER =
  'Percorso personale a scopo informativo. Nessuna promessa di guadagno né consulenza finanziaria.';

/**
 * Costruisce la card.
 *
 * La firma è la difesa: non esiste un parametro «importo» o «rendimento», e
 * quindi non c'è modo di farceli finire dentro per distrazione.
 */
export function costruisciCard(
  input:
    | { tipo: 'rank'; rank: string; punti: number }
    | { tipo: 'formazione'; lezioniCompletate: number; corso?: string }
    | { tipo: 'costanza'; giorni: number },
): Card {
  switch (input.tipo) {
    case 'rank':
      return {
        tipo: 'rank',
        valore: input.rank,
        titolo: 'Nuovo livello raggiunto',
        sottotitolo: `${arrotonda(input.punti)} punti di percorso`,
        disclaimer: DISCLAIMER,
      };
    case 'formazione':
      return {
        tipo: 'formazione',
        valore: String(Math.max(0, Math.floor(input.lezioniCompletate))),
        titolo: plurale(input.lezioniCompletate, 'Lezione completata', 'Lezioni completate'),
        sottotitolo: input.corso ? `Percorso «${input.corso}»` : 'Formazione continua',
        disclaimer: DISCLAIMER,
      };
    case 'costanza':
      return {
        tipo: 'costanza',
        valore: String(Math.max(0, Math.floor(input.giorni))),
        titolo: plurale(input.giorni, 'Giorno di costanza', 'Giorni di costanza'),
        sottotitolo: 'Un passo al giorno',
        disclaimer: DISCLAIMER,
      };
  }
}

function plurale(n: number, uno: string, molti: string): string {
  return Math.floor(n) === 1 ? uno : molti;
}

/** I punti si arrotondano: «1.247,3 punti» su una card non dice niente in più. */
function arrotonda(n: number): string {
  return String(Math.max(0, Math.round(n)));
}

// --- Controllo del testo libero ---------------------------------------------

export type MotivoBlocco =
  /** Importi, valute, cifre che sembrano soldi. */
  | 'importo'
  /** Guadagni, rendimenti, «al mese», moltiplicatori. */
  | 'guadagno'
  /** Garanzie, «senza rischi», «soldi facili». */
  | 'garanzia'
  /** Email, telefoni: dati personali che su un social non si mettono. */
  | 'dato_personale';

export type EsitoTesto =
  | { ok: true }
  | { ok: false; motivo: MotivoBlocco; frase: string };

/**
 * Le regole, in chiaro perché si possano leggere e discutere.
 *
 * Sono volutamente larghe: un falso positivo costa una riscrittura, un falso
 * negativo costa un post che promette guadagni col marchio dell'azienda sopra.
 * Nel dubbio si blocca.
 */
const REGOLE: { motivo: MotivoBlocco; re: RegExp }[] = [
  // Valute e cifre da soldi: «3.000 €», «€500», «1500 euro», «$2k».
  { motivo: 'importo', re: /(?:€|\$|£)\s?\d|(?:\d[\d.,]*)\s?(?:€|\$|£|eur\b|euro\b|dollar)/i },
  // «10k», «5 mila», «2 milioni». Il `\b` dopo la k evita di prendere «10 kg».
  { motivo: 'importo', re: /\b\d[\d.]*\s?(?:k\b|mila\b|milion)/i },

  // Il guadagno, in tutte le forme in cui si scrive davvero.
  { motivo: 'guadagno', re: /\bguadagn|\brendiment|\bprofitt|\bincass|\bstipendi|\bfatturat/i },
  { motivo: 'guadagno', re: /\bentrate\b|\brendita\b|\bpassiv[oi]\b/i },
  { motivo: 'guadagno', re: /\bal\s+mese\b|\/mese\b|\bmensilment/i },
  { motivo: 'guadagno', re: /\bx\s?\d+\b|\braddoppia|\btriplic|\broi\b/i },

  // Le garanzie: la cosa che non si può dire mai.
  { motivo: 'garanzia', re: /\bgarant|\bsicur[oa]\s+al\s+\d|\bsenza\s+risch|\bzero\s+risch/i },
  { motivo: 'garanzia', re: /\bsoldi\s+facil|\bricc[oh]|\blibert[àa]\s+finanziar/i },

  // Dati personali.
  { motivo: 'dato_personale', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  { motivo: 'dato_personale', re: /(?:\+\d{1,3}[\s.-]?)?(?:\d[\s.-]?){9,}/ },
];

/**
 * Verifica una didascalia scritta a mano.
 *
 * Restituisce la frase che ha fatto scattare la regola, non solo il motivo:
 * dire «c'è qualcosa che non va» senza indicare cosa costringe a indovinare, e
 * chi indovina riscrive a caso finché non passa.
 */
export function verificaTesto(testo: string): EsitoTesto {
  const pulito = testo.trim();
  if (pulito === '') return { ok: true };

  for (const regola of REGOLE) {
    const trovato = regola.re.exec(pulito);
    if (trovato) {
      return { ok: false, motivo: regola.motivo, frase: contesto(pulito, trovato.index) };
    }
  }
  return { ok: true };
}

/** Qualche parola attorno al punto incriminato, per far vedere dov'è. */
function contesto(testo: string, indice: number, raggio = 20): string {
  const da = Math.max(0, indice - raggio);
  const a = Math.min(testo.length, indice + raggio);
  return (da > 0 ? '…' : '') + testo.slice(da, a).trim() + (a < testo.length ? '…' : '');
}

/**
 * Nome del file dell'immagine.
 * Niente nomi di persona: il file può finire in una cartella condivisa.
 */
export function nomeFileCard(tipo: TipoCard, quando: Date): string {
  const t = Number.isNaN(quando.getTime()) ? '' : `-${quando.toISOString().slice(0, 10)}`;
  return `invisionary-${tipo}${t}.png`;
}
