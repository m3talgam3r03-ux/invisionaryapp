/**
 * Calcolo della dimensione della posizione (lottaggio).
 *
 * LA FORMULA
 *   lotti = (equity × rischio%) ÷ (stop_in_pip × valore_pip_nella_valuta_del_conto)
 *
 * IL PUNTO DOVE SI SBAGLIA
 * Il valore del pip nasce nella valuta di QUOTAZIONE dello strumento, non in
 * quella del conto. Su GBP/USD un pip vale 10 USD: se il conto è in EUR, quei
 * 10 USD vanno convertiti.
 *
 * Saltare la conversione fa rischiare una cifra diversa da quella decisa, in
 * più o in meno a seconda del cambio. Il caso pericoloso è quando la valuta di
 * quotazione vale più di quella del conto: con conto in USD su EUR/GBP, un pip
 * vale 10 GBP ≈ 12,70 USD, e chi ignora il cambio apre lotti calcolati su 10 —
 * rischiando il 27% in più di quanto crede. Non dà errore e non si vede: si
 * scopre dopo, sul conto.
 *
 * Per questo `quoteToAccountRate` è un parametro OBBLIGATORIO. Ometterlo non è
 * possibile, e passare 1 quando le valute differiscono è una scelta esplicita
 * di chi chiama, non una dimenticanza del calcolatore.
 *
 * Modulo puro: nessun import, nessuna rete. È dove vivono i test.
 */

export type Strumento = {
  symbol: string;
  /** Unità per lotto standard (es. 100.000 sul forex, 100 once sull'oro). */
  contractSize: number;
  /** Di quanto si muove il prezzo in un pip (es. 0,0001 sul forex). */
  pipSize: number;
  /** Valuta in cui è espresso il prezzo: da qui parte la conversione. */
  quoteCurrency: string;
  /** Come si chiama l'unità per l'utente: «pip» o «punto». */
  unita?: string;
};

export type IngressoLottaggio = {
  /** Saldo o equity del conto, nella valuta del conto. */
  equity: number;
  /** Percentuale di equity da rischiare (1 = 1%). */
  rischioPercento: number;
  /** Distanza dello stop, in pip/punti dello strumento. */
  stopPip: number;
  strumento: Strumento;
  /** Valuta del conto (es. 'EUR'). */
  valutaConto: string;
  /**
   * Quanto vale 1 unità della valuta di quotazione nella valuta del conto.
   * Se le due valute coincidono deve valere 1.
   */
  quoteToAccountRate: number;
  /** Sovrascrive la dimensione del contratto: sugli indici varia per broker. */
  contractSizeOverride?: number | null;
};

export type RisultatoLottaggio = {
  /** Quanto si rischia, nella valuta del conto. */
  rischioValuta: number;
  /** Valore di un pip per lotto, nella valuta di quotazione. */
  valorePipQuotazione: number;
  /** Lo stesso valore convertito nella valuta del conto. */
  valorePipConto: number;
  /** Lotti da aprire. */
  lotti: number;
  /** Unità corrispondenti (lotti × dimensione contratto). */
  unita: number;
  /** Perdita attesa se lo stop viene toccato, nella valuta del conto. */
  perditaAlloStop: number;
  /** Vero se le due valute coincidono e la conversione non serviva. */
  stessaValuta: boolean;
};

/** Vero se il valore è un numero finito e maggiore di zero. */
function positivo(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/**
 * Calcola i lotti. Restituisce `null` se un ingresso non è utilizzabile:
 * meglio nessun risultato che un numero inventato su cui qualcuno apre una
 * posizione.
 */
export function calcolaLottaggio(input: IngressoLottaggio): RisultatoLottaggio | null {
  const contractSize = input.contractSizeOverride ?? input.strumento.contractSize;

  if (
    !positivo(input.equity) ||
    !positivo(input.rischioPercento) ||
    !positivo(input.stopPip) ||
    !positivo(contractSize) ||
    !positivo(input.strumento.pipSize) ||
    !positivo(input.quoteToAccountRate)
  ) {
    return null;
  }

  const stessaValuta =
    input.strumento.quoteCurrency.toUpperCase() === input.valutaConto.toUpperCase();

  // Se le valute coincidono il tasso è 1 per definizione: ignorare un valore
  // diverso passato per sbaglio evita risultati assurdi.
  const tasso = stessaValuta ? 1 : input.quoteToAccountRate;

  const rischioValuta = input.equity * (input.rischioPercento / 100);
  const valorePipQuotazione = input.strumento.pipSize * contractSize;
  const valorePipConto = valorePipQuotazione * tasso;
  const lotti = rischioValuta / (input.stopPip * valorePipConto);

  return {
    rischioValuta,
    valorePipQuotazione,
    valorePipConto,
    lotti,
    unita: lotti * contractSize,
    // Ricalcolata invece di riusare `rischioValuta`: se un giorno i lotti
    // venissero arrotondati, questa resterebbe la perdita vera.
    perditaAlloStop: lotti * input.stopPip * valorePipConto,
    stessaValuta,
  };
}

/**
 * Converte uno stop espresso in prezzo (distanza fra ingresso e stop) nel
 * numero di pip corrispondente. Serve a chi ragiona sui livelli invece che
 * sui pip.
 */
export function pipDaPrezzo(
  prezzoIngresso: number,
  prezzoStop: number,
  pipSize: number,
): number | null {
  if (!Number.isFinite(prezzoIngresso) || !Number.isFinite(prezzoStop) || !positivo(pipSize)) {
    return null;
  }
  const distanza = Math.abs(prezzoIngresso - prezzoStop);
  if (distanza === 0) return null;
  return distanza / pipSize;
}

/**
 * Quanti lotti effettivi si possono aprire, dato il passo minimo del broker.
 * Si arrotonda SEMPRE per difetto: arrotondare per eccesso significherebbe
 * rischiare più di quanto deciso, che è l'unico errore da non fare qui.
 */
export function arrotondaAlPassoBroker(lotti: number, passo = 0.01): number {
  if (!positivo(lotti) || !positivo(passo)) return 0;
  return Math.floor(lotti / passo) * passo;
}
