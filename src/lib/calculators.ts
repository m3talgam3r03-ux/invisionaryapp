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

/** Montante con capitalizzazione e versamenti mensili (loop mensile, gestisce tasso 0). */
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
