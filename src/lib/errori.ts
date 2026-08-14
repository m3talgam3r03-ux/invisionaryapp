/**
 * Traduzione degli errori di dati in messaggi che qualcuno può leggere.
 *
 * ── PERCHÉ ESISTE ──
 * `authErrorMessage()` faceva già questo per il login. Per tutto il resto no:
 * trenta punti dell'app mostravano `error.message` così com'era. Cioè, a un
 * networker, cose come:
 *
 *   «new row violates row-level security policy for table "clients"»
 *   «JWT expired»
 *   «Failed to fetch»
 *
 * Il peggiore stava nel Trading: qualunque errore — anche un timeout di rete —
 * si presentava come «verifica .env e la migrazione 0008». Chi usa l'app non
 * ha un file .env, e non sa cosa sia una migrazione.
 *
 * ── LA REGOLA ──
 * Il testo grezzo non arriva MAI all'utente, nemmeno come ripiego: un messaggio
 * in inglese che parla di policy e di tabelle non aiuta chi legge e spiffera
 * come è fatto il database a chi guarda. Va in `console.error`, dove serve.
 *
 * Funzione pura, così si può testare senza rete.
 */

/** Cosa è andato storto, in termini che contano per chi guarda. */
export type Categoria =
  | 'rete'
  | 'permesso'
  | 'sessione'
  | 'nonTrovato'
  | 'duplicato'
  | 'collegato'
  | 'lento'
  | 'sconosciuto';

/** La forma minima di un errore Supabase/PostgREST. */
type Grezzo = { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };

const MESSAGGI: Record<Categoria, string> = {
  rete: 'Impossibile raggiungere il server. Controlla la connessione e riprova.',
  permesso: 'Non hai i permessi per vedere o modificare questo.',
  sessione: 'La sessione è scaduta. Esci e rientra.',
  nonTrovato: 'Non trovato: potrebbe essere stato eliminato.',
  duplicato: 'Esiste già: questo dato è stato inserito un’altra volta.',
  collegato: 'Non si può eliminare: c’è dell’altro collegato a questo.',
  lento: 'La richiesta ha impiegato troppo tempo. Riprova fra poco.',
  sconosciuto: 'Qualcosa non ha funzionato. Riprova fra poco.',
};

/**
 * In che categoria cade un errore.
 *
 * Prima il codice, che è preciso; il testo solo dopo, perché cambia con le
 * versioni della libreria e con la lingua del browser.
 */
export function categoriaErrore(errore: unknown): Categoria {
  const g = (errore ?? {}) as Grezzo;
  const codice = typeof g.code === 'string' ? g.code.toUpperCase() : '';
  const testo = testoDi(errore).toLowerCase();

  // ── Codici Postgres (SQLSTATE) e PostgREST ────────────────────────────────
  switch (codice) {
    case '42501': // insufficient_privilege
    case 'PGRST301': // JWT non valido per la policy
      return 'permesso';
    case 'PGRST116': // nessuna riga dove ne serviva una
      return 'nonTrovato';
    case '23505': // unique_violation
      return 'duplicato';
    case '23503': // foreign_key_violation
      return 'collegato';
    case '57014': // query annullata per timeout
      return 'lento';
  }

  // ── Testo ─────────────────────────────────────────────────────────────────
  if (
    testo.includes('failed to fetch') ||
    testo.includes('network request failed') ||
    testo.includes('networkerror') ||
    testo.includes('load failed')
  ) {
    return 'rete';
  }
  if (testo.includes('jwt expired') || testo.includes('token is expired')) return 'sessione';
  // «row-level security» e «permission denied» sono la stessa cosa vista da
  // due punti diversi: in entrambi i casi il database ha detto di no.
  if (testo.includes('row-level security') || testo.includes('permission denied')) {
    return 'permesso';
  }
  if (testo.includes('duplicate key')) return 'duplicato';
  if (testo.includes('violates foreign key')) return 'collegato';
  if (testo.includes('timeout') || testo.includes('timed out')) return 'lento';

  return 'sconosciuto';
}

/**
 * Il messaggio da mostrare.
 *
 * `contesto` sostituisce il testo generico quando la schermata sa dire qualcosa
 * di più utile — «Impossibile caricare i clienti» invece di «Qualcosa non ha
 * funzionato» — ma solo per il caso sconosciuto: se il database ha detto
 * «non hai i permessi», quella è l'informazione, e non va coperta.
 */
export function messaggioErrore(errore: unknown, contesto?: string): string {
  const categoria = categoriaErrore(errore);

  // Il grezzo non si mostra, ma non si butta: senza, un problema vero
  // diventa impossibile da capire guardando i log.
  if (categoria === 'sconosciuto') {
    const grezzo = testoDi(errore);
    if (grezzo) console.error('[errore non riconosciuto]', grezzo);
    return contesto ?? MESSAGGI.sconosciuto;
  }

  return MESSAGGI[categoria];
}

/** Il testo di un errore, qualunque forma abbia. */
function testoDi(errore: unknown): string {
  if (errore instanceof Error) return errore.message;
  if (typeof errore === 'string') return errore;
  const g = (errore ?? {}) as Grezzo;
  if (typeof g.message === 'string') return g.message;
  return '';
}
