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

// --- Calcolatore lottaggio (position sizing forex) --------------------------

export type LotResult = {
  riskAmount: number;
  pipValuePerLotAccount: number;
  lots: number;
  units: number;
};

/** Dimensione pip in base alla coppia: 0.01 per le coppie JPY, altrimenti 0.0001. */
export function pipSizeForPair(pair: string): number {
  return /jpy/i.test(pair) ? 0.01 : 0.0001;
}

/**
 * Size della posizione: rischio in valuta / (stop loss in pip × valore pip per lotto).
 * `quoteToAccountRate` = tasso valuta quotata → valuta del conto (1 se coincidono).
 */
export function computePositionSize(params: {
  balance: number;
  riskPercent: number;
  stopLossPips: number;
  pipSize: number;
  quoteToAccountRate: number;
  contractSize?: number;
}): LotResult | null {
  const contractSize = params.contractSize ?? 100_000; // lotto standard
  const { balance, riskPercent, stopLossPips, pipSize, quoteToAccountRate } = params;

  if (
    !Number.isFinite(balance) ||
    !Number.isFinite(riskPercent) ||
    !Number.isFinite(stopLossPips) ||
    !Number.isFinite(quoteToAccountRate) ||
    balance <= 0 ||
    riskPercent <= 0 ||
    stopLossPips <= 0 ||
    pipSize <= 0 ||
    quoteToAccountRate <= 0
  ) {
    return null;
  }

  const riskAmount = balance * (riskPercent / 100);
  const pipValueQuotePerLot = pipSize * contractSize; // in valuta quotata
  const pipValuePerLotAccount = pipValueQuotePerLot * quoteToAccountRate;
  const lots = riskAmount / (stopLossPips * pipValuePerLotAccount);

  return { riskAmount, pipValuePerLotAccount, lots, units: lots * contractSize };
}

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
