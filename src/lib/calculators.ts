/**
 * Logica di calcolo (pura, lato client) per i calcolatori Invisionary.
 * Nessuna chiamata esterna.
 */

/** Converte una stringa (accetta la virgola decimale) in numero; NaN se non valida. */
export function parseLocaleNumber(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return NaN;
  return Number(normalized);
}

// Il calcolo del lottaggio vive in `src/lib/position-size.ts`: la dimensione
// del contratto e il pip arrivano dal database, non da una regola indovinata
// dal nome della coppia. Due implementazioni della stessa formula sono un
// rischio — prima o poi qualcuno userebbe quella sbagliata.

// --- Interesse composto -----------------------------------------------------

export type CompoundPoint = {
  year: number;
  balance: number;
  contributed: number;
  interest: number;
};

export type CompoundResult = {
  futureValue: number;
  totalContributed: number;
  totalInterest: number;
  perYear: CompoundPoint[];
};

/**
 * Montante con capitalizzazione e versamenti mensili (loop mensile, gestisce tasso 0).
 *
 * `annualRatePercent` è un tasso **nominale** annuo con capitalizzazione
 * mensile: è la convenzione di questi calcolatori, ma non è indolore —
 * scrivendo 6 il rendimento effettivo annuo è 6,17%. L'interfaccia lo dice.
 */
export function computeCompoundInterest(params: {
  principal: number;
  monthlyContribution: number;
  annualRatePercent: number;
  years: number;
}): CompoundResult | null {
  const { principal, monthlyContribution, annualRatePercent, years } = params;

  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(monthlyContribution) ||
    !Number.isFinite(annualRatePercent) ||
    !Number.isFinite(years) ||
    principal < 0 ||
    monthlyContribution < 0 ||
    years <= 0 ||
    years > 100
  ) {
    return null;
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  const perYear: CompoundPoint[] = [];
  let balance = principal;
  let contributed = principal;

  const totalMonths = Math.round(years * 12);
  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    contributed += monthlyContribution;
    if (m % 12 === 0) {
      perYear.push({ year: m / 12, balance, contributed, interest: balance - contributed });
    }
  }

  return {
    futureValue: balance,
    totalContributed: contributed,
    totalInterest: balance - contributed,
    perYear,
  };
}

// --- Geometria del grafico ad aree ------------------------------------------

export type PuntoGrafico = {
  anno: number;
  /** Posizione orizzontale, 0 → 1. */
  x: number;
  /** Quota versata, 0 → 1 rispetto al massimo del grafico. */
  yVersato: number;
  /** Versato + interessi, 0 → 1. La differenza fra le due è l'area dorata. */
  yTotale: number;
};

/**
 * Coordinate normalizzate (0 → 1) per il grafico ad aree impilate.
 *
 * PERCHÉ IMPILATE E NON UNA CURVA SOLA
 * Una curva sola del montante fa sembrare che tutta la crescita venga dagli
 * interessi. Quasi sempre non è così: nei primi anni la linea sale perché si
 * sta versando. Separare le due aree mostra quando gli interessi cominciano
 * davvero a contare — che è l'unica cosa che questo calcolatore deve insegnare.
 *
 * Include l'anno 0 (il capitale di partenza), altrimenti il grafico partirebbe
 * da zero facendo sembrare guadagnato anche quello che è stato messo.
 *
 * Funzione pura: nessun import, nessuna dipendenza dal motore grafico.
 */
export function serieGrafico(
  perYear: CompoundPoint[],
  capitaleIniziale: number,
): { punti: PuntoGrafico[]; massimo: number } | null {
  if (perYear.length === 0 || !Number.isFinite(capitaleIniziale) || capitaleIniziale < 0) {
    return null;
  }

  const grezzi = [
    { anno: 0, versato: capitaleIniziale, totale: capitaleIniziale },
    ...perYear.map((p) => ({ anno: p.year, versato: p.contributed, totale: p.balance })),
  ];

  const massimo = Math.max(...grezzi.map((p) => p.totale));
  // Tutto a zero: non c'è niente da disegnare, e dividere per zero darebbe NaN.
  if (!Number.isFinite(massimo) || massimo <= 0) return null;

  const ultimoAnno = grezzi[grezzi.length - 1].anno;
  if (ultimoAnno <= 0) return null;

  return {
    massimo,
    punti: grezzi.map((p) => ({
      anno: p.anno,
      x: p.anno / ultimoAnno,
      yVersato: p.versato / massimo,
      yTotale: p.totale / massimo,
    })),
  };
}
