/**
 * Test del calcolo del lottaggio (src/lib/position-size.ts).
 *
 * Ogni caso è verificabile a mano, e il controllo che conta è sempre lo stesso:
 * la perdita allo stop deve corrispondere ESATTAMENTE al rischio deciso. Se
 * quella tornasse, ma i lotti fossero sbagliati, sarebbe un problema di
 * arrotondamento; se non torna, la formula è rotta.
 */
import { describe, expect, it } from 'vitest';

import {
  arrotondaAlPassoBroker,
  calcolaLottaggio,
  pipDaPrezzo,
  type Strumento,
} from '@/lib/position-size';

const EURUSD: Strumento = {
  symbol: 'EUR/USD',
  contractSize: 100_000,
  pipSize: 0.0001,
  quoteCurrency: 'USD',
};
const GBPUSD: Strumento = { ...EURUSD, symbol: 'GBP/USD' };
const EURGBP: Strumento = { ...EURUSD, symbol: 'EUR/GBP', quoteCurrency: 'GBP' };
const USDJPY: Strumento = {
  symbol: 'USD/JPY',
  contractSize: 100_000,
  pipSize: 0.01,
  quoteCurrency: 'JPY',
};
const XAUUSD: Strumento = {
  symbol: 'XAU/USD',
  contractSize: 100,
  pipSize: 0.01,
  quoteCurrency: 'USD',
  unita: 'punto',
};
const US30: Strumento = {
  symbol: 'US30',
  contractSize: 1,
  pipSize: 1,
  quoteCurrency: 'USD',
  unita: 'punto',
};
const GER40: Strumento = { ...US30, symbol: 'GER40', quoteCurrency: 'EUR' };

describe('caso base: quotazione e conto nella stessa valuta', () => {
  it('EUR/USD con conto in USD, 1% di 10.000 e stop 20 pip → 0,50 lotti', () => {
    const r = calcolaLottaggio({
      equity: 10_000,
      rischioPercento: 1,
      stopPip: 20,
      strumento: EURUSD,
      valutaConto: 'USD',
      quoteToAccountRate: 1,
    });
    expect(r).not.toBeNull();
    expect(r!.valorePipQuotazione).toBeCloseTo(10, 6); // 0,0001 × 100.000
    expect(r!.lotti).toBeCloseTo(0.5, 6);
    expect(r!.unita).toBeCloseTo(50_000, 6);
    expect(r!.perditaAlloStop, 'deve corrispondere al rischio deciso').toBeCloseTo(100, 6);
    expect(r!.stessaValuta).toBe(true);
  });
});

describe('IL CASO CHE CONTA: conto in valuta diversa dalla quotazione', () => {
  it('GBP/USD con conto in EUR converte il valore del pip', () => {
    // 1 USD = 0,909091 EUR (EUR/USD a 1,10)
    const r = calcolaLottaggio({
      equity: 10_000,
      rischioPercento: 1,
      stopPip: 20,
      strumento: GBPUSD,
      valutaConto: 'EUR',
      quoteToAccountRate: 1 / 1.1,
    });
    expect(r!.valorePipQuotazione).toBeCloseTo(10, 6); // in USD
    expect(r!.valorePipConto).toBeCloseTo(9.090909, 5); // in EUR
    expect(r!.lotti).toBeCloseTo(0.55, 5);
    expect(r!.perditaAlloStop).toBeCloseTo(100, 6);
    expect(r!.stessaValuta).toBe(false);
  });

  it('ignorare il cambio porta a rischiare più del deciso', () => {
    // Conto in USD su EUR/GBP: un pip vale 10 GBP ≈ 12,70 USD.
    const corretto = calcolaLottaggio({
      equity: 10_000,
      rischioPercento: 1,
      stopPip: 20,
      strumento: EURGBP,
      valutaConto: 'USD',
      quoteToAccountRate: 1.27, // GBP → USD
    })!;

    // Come farebbe chi tratta il valore del pip come se fosse già in USD.
    const sbagliato = calcolaLottaggio({
      equity: 10_000,
      rischioPercento: 1,
      stopPip: 20,
      strumento: { ...EURGBP, quoteCurrency: 'USD' },
      valutaConto: 'USD',
      quoteToAccountRate: 1,
    })!;

    expect(corretto.lotti).toBeCloseTo(0.393701, 5);
    expect(sbagliato.lotti).toBeCloseTo(0.5, 6);

    // La perdita reale dei lotti sbagliati, valutata col cambio vero.
    const perditaReale = sbagliato.lotti * 20 * 10 * 1.27;
    expect(perditaReale).toBeCloseTo(127, 6);
    expect(perditaReale / 100, 'il 27% in più del rischio deciso').toBeCloseTo(1.27, 6);
  });

  it('USD/JPY con conto in EUR: pip da 1.000 JPY', () => {
    const r = calcolaLottaggio({
      equity: 10_000,
      rischioPercento: 2,
      stopPip: 25,
      strumento: USDJPY,
      valutaConto: 'EUR',
      quoteToAccountRate: 0.0062, // JPY → EUR
    })!;
    expect(r.valorePipQuotazione).toBeCloseTo(1000, 6); // 0,01 × 100.000
    expect(r.valorePipConto).toBeCloseTo(6.2, 6);
    expect(r.lotti).toBeCloseTo(200 / 155, 6);
    expect(r.perditaAlloStop).toBeCloseTo(200, 6);
  });

  it('US30 con conto in EUR', () => {
    const r = calcolaLottaggio({
      equity: 20_000,
      rischioPercento: 0.5,
      stopPip: 150,
      strumento: US30,
      valutaConto: 'EUR',
      quoteToAccountRate: 1 / 1.1,
    })!;
    expect(r.valorePipConto).toBeCloseTo(0.909091, 5);
    expect(r.lotti).toBeCloseTo(0.733333, 5);
    expect(r.perditaAlloStop).toBeCloseTo(100, 6);
  });
});

describe('metalli e indici', () => {
  it('XAU/USD con conto in USD: 100 once, 0,01 per punto', () => {
    const r = calcolaLottaggio({
      equity: 5_000,
      rischioPercento: 1,
      stopPip: 300,
      strumento: XAUUSD,
      valutaConto: 'USD',
      quoteToAccountRate: 1,
    })!;
    expect(r.valorePipQuotazione).toBeCloseTo(1, 6); // 0,01 × 100
    expect(r.lotti).toBeCloseTo(50 / 300, 6);
    expect(r.perditaAlloStop).toBeCloseTo(50, 6);
  });

  it('GER40 con conto in EUR: quotazione e conto coincidono', () => {
    const r = calcolaLottaggio({
      equity: 10_000,
      rischioPercento: 1,
      stopPip: 50,
      strumento: GER40,
      valutaConto: 'EUR',
      quoteToAccountRate: 1,
    })!;
    expect(r.lotti).toBeCloseTo(2, 6);
    expect(r.stessaValuta).toBe(true);
  });

  it('la dimensione del contratto si può sovrascrivere: sugli indici varia per broker', () => {
    const r = calcolaLottaggio({
      equity: 10_000,
      rischioPercento: 1,
      stopPip: 100,
      strumento: US30,
      valutaConto: 'USD',
      quoteToAccountRate: 1,
      contractSizeOverride: 5, // 5 USD per punto
    })!;
    expect(r.valorePipQuotazione).toBeCloseTo(5, 6);
    expect(r.lotti).toBeCloseTo(0.2, 6);
    expect(r.perditaAlloStop).toBeCloseTo(100, 6);
  });
});

describe('difese', () => {
  it('con valute uguali un tasso sbagliato viene ignorato', () => {
    // Passare 1,27 su un conto in USD con quotazione in USD è un errore di chi
    // chiama: il calcolo non deve seguirlo.
    const r = calcolaLottaggio({
      equity: 10_000,
      rischioPercento: 1,
      stopPip: 20,
      strumento: EURUSD,
      valutaConto: 'usd', // anche con maiuscole diverse
      quoteToAccountRate: 1.27,
    })!;
    expect(r.valorePipConto).toBeCloseTo(10, 6);
    expect(r.lotti).toBeCloseTo(0.5, 6);
  });

  it('ingressi non validi non producono un numero', () => {
    const base = {
      equity: 10_000,
      rischioPercento: 1,
      stopPip: 20,
      strumento: EURUSD,
      valutaConto: 'USD',
      quoteToAccountRate: 1,
    };
    expect(calcolaLottaggio({ ...base, equity: 0 })).toBeNull();
    expect(calcolaLottaggio({ ...base, equity: -100 })).toBeNull();
    expect(calcolaLottaggio({ ...base, rischioPercento: 0 })).toBeNull();
    expect(calcolaLottaggio({ ...base, stopPip: 0 })).toBeNull();
    expect(calcolaLottaggio({ ...base, quoteToAccountRate: 0 })).toBeNull();
    expect(calcolaLottaggio({ ...base, equity: NaN })).toBeNull();
    expect(calcolaLottaggio({ ...base, contractSizeOverride: 0 })).toBeNull();
  });
});

describe('stop espresso in prezzo', () => {
  it('converte la distanza fra ingresso e stop in pip', () => {
    expect(pipDaPrezzo(1.105, 1.1, 0.0001)).toBeCloseTo(50, 6);
    expect(pipDaPrezzo(1.1, 1.105, 0.0001), 'la direzione non conta').toBeCloseTo(50, 6);
    expect(pipDaPrezzo(151.2, 150.7, 0.01)).toBeCloseTo(50, 6);
  });

  it('uno stop a distanza zero non è uno stop', () => {
    expect(pipDaPrezzo(1.1, 1.1, 0.0001)).toBeNull();
  });
});

describe('passo minimo del broker', () => {
  it('arrotonda sempre per difetto: eccedere il rischio è l’unico errore da non fare', () => {
    expect(arrotondaAlPassoBroker(0.5499, 0.01)).toBeCloseTo(0.54, 6);
    expect(arrotondaAlPassoBroker(0.55, 0.01)).toBeCloseTo(0.55, 6);
    expect(arrotondaAlPassoBroker(1.239, 0.1)).toBeCloseTo(1.2, 6);
  });

  it('sotto il passo minimo non si apre nulla', () => {
    expect(arrotondaAlPassoBroker(0.004, 0.01)).toBe(0);
    expect(arrotondaAlPassoBroker(0, 0.01)).toBe(0);
  });
});
