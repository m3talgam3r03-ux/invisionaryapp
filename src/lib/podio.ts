/**
 * Il podio del mese — parte pura.
 *
 * Nessun import: qui c'è solo quello che si può verificare con un test.
 *
 * ⚠️ Sul podio non compaiono MAI importi né percentuali di guadagno: solo
 * posizione, nome e win rate. È lo stesso vincolo della classifica trader, e
 * qui pesa di più perché il podio lo vede tutta la rete.
 */

export type VocePodio = {
  posizione: number;
  userId: string;
  nome: string;
  winRate: number;
  operazioni: number;
};

/**
 * L'ordine con cui si disegnano le colonne: **2 · 1 · 3**.
 *
 * Un podio si legge così da sempre: il primo sta al centro e più in alto.
 * Disporli 1-2-3 da sinistra farebbe sembrare il vincitore un terzo classificato.
 */
export function ordinePodio(voci: VocePodio[]): VocePodio[] {
  const per = new Map(voci.map((v) => [v.posizione, v]));
  return [2, 1, 3].map((p) => per.get(p)).filter((v): v is VocePodio => v !== undefined);
}

/**
 * Il mese da mostrare: quello **appena chiuso**, non quello in corso.
 *
 * Il podio si congela a mese finito. Mostrare il mese corrente farebbe vedere
 * una classifica che cambia sotto gli occhi, e nessuno saprebbe se il primo è
 * primo davvero o solo per adesso.
 */
export function mesePrecedente(oggi: Date): string {
  const d = new Date(Date.UTC(oggi.getFullYear(), oggi.getMonth() - 1, 1));
  const mese = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mese}-01`;
}

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** `2026-07-01` → «luglio 2026». */
export function etichettaMese(periodo: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(periodo);
  if (!m) return periodo;
  const indice = Number(m[2]) - 1;
  if (indice < 0 || indice > 11) return periodo;
  return `${MESI[indice]} ${m[1]}`;
}

/**
 * I punti che vale una posizione, dalle regole caricate dal database.
 * Fuori dalle posizioni premiate vale zero, e va detto invece di lasciar
 * credere che partecipare basti.
 */
export function puntiPerPosizione(regole: Map<number, number>, posizione: number): number {
  return regole.get(posizione) ?? 0;
}

/**
 * Quante posizioni sono premiate. Serve a scrivere «i primi 10 prendono punti»
 * senza cablare il numero nell'interfaccia: le regole stanno in tabella e
 * l'admin le cambia senza rilasci.
 */
export function posizioniPremiate(regole: Map<number, number>): number {
  const posizioni = [...regole.keys()].filter((p) => (regole.get(p) ?? 0) > 0);
  return posizioni.length === 0 ? 0 : Math.max(...posizioni);
}
