/**
 * La mappa degli iscritti per regione — parte pura.
 *
 * ── PERCHÉ UNA MAPPA A CASELLE E NON LA SAGOMA DELL'ITALIA ──
 * Le regioni sono disposte a caselle, ognuna nella sua posizione geografica
 * relativa (Valle d'Aosta in alto a sinistra, Sicilia in basso). Due motivi:
 *
 * · Su uno schermo da telefono la sagoma vera è illeggibile dove serve di più:
 *   Liguria, Molise e Valle d'Aosta diventano striscioline di pochi pixel, e
 *   sono proprio quelle su cui non si capirebbe il colore.
 * · Un cartogramma a caselle dà a ogni regione lo stesso spazio, quindi il
 *   colore si legge allo stesso modo ovunque. Con la sagoma vera, il Piemonte
 *   sembra «più importante» del Molise solo perché è più grande.
 *
 * Le geometrie stanno in questo file come dati: sostituirle con i contorni
 * reali significa cambiare `REGIONI`, non il componente che le disegna.
 *
 * Modulo puro: nessun import.
 */

export type Regione = {
  nome: string;
  /** Sigla per le caselle strette. */
  sigla: string;
  /** Colonna sulla griglia, 0 = ovest. */
  colonna: number;
  /** Riga sulla griglia, 0 = nord. */
  riga: number;
};

/**
 * Le 20 regioni, disposte come stanno sulla carta.
 *
 * La griglia è 4 colonne × 10 righe: abbastanza per tenere il nord-ovest
 * separato dal nord-est e le isole al loro posto, senza diventare un mosaico
 * che nessuno riconosce.
 */
export const REGIONI: Regione[] = [
  { nome: 'Trentino-Alto Adige', sigla: 'TAA', colonna: 1, riga: 0 },
  { nome: 'Friuli-Venezia Giulia', sigla: 'FVG', colonna: 2, riga: 0 },
  { nome: "Valle d'Aosta", sigla: 'VdA', colonna: 0, riga: 1 },
  { nome: 'Lombardia', sigla: 'LOM', colonna: 1, riga: 1 },
  { nome: 'Veneto', sigla: 'VEN', colonna: 2, riga: 1 },
  { nome: 'Piemonte', sigla: 'PIE', colonna: 0, riga: 2 },
  { nome: 'Emilia-Romagna', sigla: 'EMR', colonna: 1, riga: 2 },
  { nome: 'Liguria', sigla: 'LIG', colonna: 0, riga: 3 },
  { nome: 'Toscana', sigla: 'TOS', colonna: 1, riga: 3 },
  { nome: 'Marche', sigla: 'MAR', colonna: 2, riga: 3 },
  { nome: 'Umbria', sigla: 'UMB', colonna: 1, riga: 4 },
  { nome: 'Abruzzo', sigla: 'ABR', colonna: 2, riga: 4 },
  { nome: 'Sardegna', sigla: 'SAR', colonna: 0, riga: 5 },
  { nome: 'Lazio', sigla: 'LAZ', colonna: 1, riga: 5 },
  { nome: 'Molise', sigla: 'MOL', colonna: 2, riga: 5 },
  { nome: 'Campania', sigla: 'CAM', colonna: 1, riga: 6 },
  { nome: 'Puglia', sigla: 'PUG', colonna: 2, riga: 6 },
  { nome: 'Basilicata', sigla: 'BAS', colonna: 1, riga: 7 },
  { nome: 'Calabria', sigla: 'CAL', colonna: 1, riga: 8 },
  { nome: 'Sicilia', sigla: 'SIC', colonna: 0, riga: 9 },
];

export const COLONNE = 3;
export const RIGHE = 10;

/**
 * Il conteggio di una regione.
 * `iscritti` è `null` quando il database ha soppresso il numero perché troppo
 * piccolo: `null` non è zero, e i due casi si mostrano in modo diverso.
 */
export type ConteggioRegione = {
  regione: string;
  iscritti: number | null;
};

export type CasellaMappa = Regione & {
  /** `null` = nascosto per pochi iscritti; `0` = nessun iscritto. */
  iscritti: number | null;
  /** Livello di colore da 0 (vuoto) a 4 (il più pieno). */
  livello: number;
  /** Vero se il numero c'è ma non si può mostrare. */
  nascosto: boolean;
};

/**
 * Unisce le regioni ai conteggi e assegna il livello di colore.
 *
 * Le soglie si calcolano sul MASSIMO osservato, non su valori fissi: una rete
 * di 50 persone e una di 5.000 devono produrre entrambe una mappa leggibile.
 * Con soglie fisse, la prima sarebbe tutta dello stesso colore.
 */
export function costruisciMappa(conteggi: ConteggioRegione[]): CasellaMappa[] {
  const per = new Map(conteggi.map((c) => [c.regione, c.iscritti]));
  const massimo = Math.max(0, ...conteggi.map((c) => c.iscritti ?? 0));

  return REGIONI.map((r) => {
    const presente = per.has(r.nome);
    const iscritti = presente ? (per.get(r.nome) ?? null) : 0;
    return {
      ...r,
      iscritti,
      nascosto: presente && iscritti === null,
      livello: livelloColore(iscritti, massimo),
    };
  });
}

/**
 * Da 0 a 4. Una regione nascosta prende il livello 1: si vede che c'è
 * qualcuno, senza dire quanti — mostrarla vuota sarebbe una bugia.
 */
export function livelloColore(iscritti: number | null, massimo: number): number {
  if (iscritti === null) return 1;
  if (iscritti <= 0) return 0;
  if (massimo <= 0) return 0;
  const quota = iscritti / massimo;
  if (quota > 0.75) return 4;
  if (quota > 0.5) return 3;
  if (quota > 0.25) return 2;
  return 1;
}

export type RiepilogoMappa = {
  totaleVisibile: number;
  regioniVisibili: number;
  regioniNascoste: number;
  senzaRegione: number;
};

/**
 * La riga sotto la mappa.
 *
 * Dice sempre quante regioni sono nascoste: una mappa che tace su ciò che non
 * mostra fa credere che il vuoto sia vuoto davvero.
 */
export function testoRiepilogo(r: RiepilogoMappa): string {
  const parti: string[] = [];
  parti.push(
    `${r.totaleVisibile} ${r.totaleVisibile === 1 ? 'iscritto' : 'iscritti'} ` +
      `in ${r.regioniVisibili} ${r.regioniVisibili === 1 ? 'regione' : 'regioni'}`,
  );
  if (r.regioniNascoste > 0) {
    parti.push(
      `${r.regioniNascoste} ${r.regioniNascoste === 1 ? 'regione ha' : 'regioni hanno'} ` +
        'troppi pochi iscritti per essere mostrate',
    );
  }
  if (r.senzaRegione > 0) {
    parti.push(`${r.senzaRegione} non ha indicato la regione`);
  }
  return parti.join(' · ') + '.';
}

/** La regione più popolosa fra quelle mostrabili. `null` se non se ne può dire nessuna. */
export function regionePiuAffollata(conteggi: ConteggioRegione[]): ConteggioRegione | null {
  const visibili = conteggi.filter((c) => c.iscritti !== null && c.iscritti > 0);
  if (visibili.length === 0) return null;
  return visibili.reduce((a, b) => ((b.iscritti ?? 0) > (a.iscritti ?? 0) ? b : a));
}

/** Vero se il nome è una delle 20 regioni. Rispecchia il CHECK del database. */
export function regioneValida(nome: string): boolean {
  return REGIONI.some((r) => r.nome === nome);
}
