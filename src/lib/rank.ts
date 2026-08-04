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
