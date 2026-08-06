/**
 * Punti premio e catalogo — parte pura.
 *
 * ⚠️ I punti premio NON sono i punti del rank.
 *   Rank   → un livello. Si ricalcola dalle metriche, non si spende.
 *   Premio → una valuta. Si accumula, si spende, il saldo scende.
 * Confonderle farebbe scendere il rank a chi ritira un regalo. Il modulo del
 * rank è `rank.ts` e non ha niente in comune con questo.
 *
 * Nessun import: qui c'è solo quello che si può verificare con un test.
 */

export type OriginePunti = 'maturazione' | 'bonus' | 'riscatto' | 'rimborso';

export type VocePunti = {
  id: string;
  delta: number;
  origine: OriginePunti;
  motivo: string | null;
  createdAt: string;
};

export type Premio = {
  id: string;
  nome: string;
  descrizione: string | null;
  costoPunti: number;
  /** `null` = senza limite. */
  disponibili: number | null;
  attivo: boolean;
};

export type StatoRiscatto = 'richiesta' | 'approvata' | 'consegnata' | 'rifiutata';

/** Perché un premio non è riscattabile adesso. `null` = si può. */
export type Impedimento = 'esaurito' | 'non_attivo' | 'punti_insufficienti';

/**
 * Se e perché un premio non si può riscattare.
 *
 * L'ordine dei controlli conta: un premio esaurito resta esaurito anche per
 * chi ha punti da vendere, e dirgli «ti mancano punti» sarebbe falso.
 */
export function impedimento(premio: Premio, saldo: number): Impedimento | null {
  if (!premio.attivo) return 'non_attivo';
  if (premio.disponibili !== null && premio.disponibili <= 0) return 'esaurito';
  if (saldo < premio.costoPunti) return 'punti_insufficienti';
  return null;
}

/** Quanti punti mancano per un premio. Zero se bastano. */
export function puntiMancanti(premio: Premio, saldo: number): number {
  return Math.max(0, premio.costoPunti - saldo);
}

/**
 * Avanzamento verso un premio, da 0 a 1.
 * Serve a mostrare una barra: «sei a metà» motiva più di «ti mancano 250».
 */
export function avanzamento(premio: Premio, saldo: number): number {
  if (premio.costoPunti <= 0) return 1;
  return Math.min(1, Math.max(0, saldo / premio.costoPunti));
}

/**
 * Il saldo ricalcolato dal registro.
 *
 * Nel database il saldo è una colonna con un CHECK >= 0, che è ciò che
 * impedisce di spendere punti che non ci sono anche quando due richieste
 * arrivano insieme. Questa funzione serve a verificare che quella colonna e il
 * registro dicano la stessa cosa: se divergono, la verità è il registro.
 */
export function saldoDalRegistro(voci: VocePunti[]): number {
  return voci.reduce((somma, v) => somma + v.delta, 0);
}

/** Vero se saldo e registro non coincidono (oltre l'errore dei decimali). */
export function saldoIncoerente(saldo: number, voci: VocePunti[]): boolean {
  return Math.abs(saldo - saldoDalRegistro(voci)) > 0.0001;
}

/**
 * Il premio più vicino fra quelli che non ci si può ancora permettere.
 * È l'obiettivo da mostrare: quello subito dopo, non quello più costoso.
 */
export function prossimoObiettivo(premi: Premio[], saldo: number): Premio | null {
  const raggiungibili = premi
    .filter((p) => p.attivo && (p.disponibili === null || p.disponibili > 0))
    .filter((p) => p.costoPunti > saldo)
    .sort((a, b) => a.costoPunti - b.costoPunti);
  return raggiungibili[0] ?? null;
}

/** Il segno davanti a una voce del registro: «+120» o «−250». */
export function segno(delta: number): string {
  // Meno tipografico, non il trattino: in una colonna di numeri si distingue.
  return delta < 0 ? `−${Math.abs(delta)}` : `+${delta}`;
}
