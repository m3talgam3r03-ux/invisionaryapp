/**
 * Rank a carte (2 → Asso): solo la presentazione.
 *
 * ⚠️ Pesi e soglie NON sono qui: stanno in `rank_rules` e `rank_tiers` sul
 * database (migrazione 0015) e li modifica l'admin senza un rilascio.
 *
 * Di conseguenza nemmeno «qual è il livello massimo» è una costante del codice:
 * lo dice il database. Il segnale è `punti_al_prossimo` nullo — non c'è un
 * livello oltre — ed è quello che usa l'interfaccia.
 *
 * Nessun import da `@/theme`: questo modulo resta puro e testabile senza
 * caricare React Native.
 */

/** Nomi italiani per le figure; i numeri restano tali. */
const NOME_FIGURA: Record<string, string> = {
  A: 'Asso',
  K: 'Re',
  Q: 'Donna',
  J: 'Jack',
};

/**
 * Come si legge un livello. I livelli sono configurabili: se un giorno non
 * fossero più carte, il nome passa così com'è invece di rompersi.
 */
export function rankLabel(nome: string): string {
  return NOME_FIGURA[nome] ?? nome;
}

/**
 * Quanto si è avanti verso il livello successivo, da 0 a 1.
 * `puntiAlProssimo` nullo significa che si è in cima alla scala.
 */
export function progressoVersoProssimo(punti: number, puntiAlProssimo: number | null): number {
  if (puntiAlProssimo === null || puntiAlProssimo <= 0) return 1;
  const traguardo = punti + puntiAlProssimo;
  if (traguardo <= 0) return 0;
  return Math.max(0, Math.min(1, punti / traguardo));
}

/** Cosa mostrare al posto della classifica, quando classifica non è. */
export type FormaClassifica =
  /** Nessuna riga: il rank non è ancora stato calcolato. */
  | 'vuota'
  /** Una riga sola, e sono io: non è una gara, è il mio punteggio. */
  | 'solo-io'
  /** Più persone: una classifica vera. */
  | 'classifica';

/**
 * Che forma ha la classifica per chi la guarda.
 *
 * ── PERCHÉ SERVE ──
 * `classifica()` nel database filtra con `can_read_member()`: un collaboratore
 * riceve SOLO la propria riga. La schermata la disegnava lo stesso come una
 * classifica, e il risultato era una card sola, in posizione 1, col bordo
 * acceso: sembrava «sei primo della rete».
 *
 * Non è un difetto di sicurezza — il perimetro è giusto, e nessun dato altrui
 * esce. È che presentare il proprio punteggio come un podio dice una cosa
 * falsa, e chi la scopre parlando con un collega smette di fidarsi anche del
 * resto della schermata.
 */
export function formaClassifica(
  righe: { user_id: string }[] | undefined,
  io: string | undefined,
): FormaClassifica {
  if (!righe || righe.length === 0) return 'vuota';
  if (righe.length === 1 && io !== undefined && righe[0].user_id === io) return 'solo-io';
  return 'classifica';
}
