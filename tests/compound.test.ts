/**
 * Test dell'interesse composto (src/lib/calculators.ts).
 *
 * I casi sono scelti per essere verificabili a mano o con una formula chiusa:
 * dove esiste la formula dell'annualità, il risultato del loop mensile deve
 * coincidere. Se un giorno si passasse a un calcolo in forma chiusa, questi
 * test resterebbero validi.
 */
import { describe, expect, it } from 'vitest';

import { computeCompoundInterest, parseLocaleNumber, serieGrafico } from '@/lib/calculators';

describe('casi con un risultato noto', () => {
  it('capitale fermo senza versamenti: la formula del montante composto', () => {
    const r = computeCompoundInterest({
      principal: 10_000,
      monthlyContribution: 0,
      annualRatePercent: 6,
      years: 10,
    })!;
    // 10.000 × (1 + 0,06/12)^120
    const atteso = 10_000 * Math.pow(1 + 0.06 / 12, 120);
    expect(r.futureValue).toBeCloseTo(atteso, 6);
    expect(r.futureValue).toBeCloseTo(18_193.97, 2);
    expect(r.totalContributed).toBeCloseTo(10_000, 6);
    expect(r.totalInterest).toBeCloseTo(atteso - 10_000, 6);
  });

  it('solo versamenti mensili: la formula dell’annualità posticipata', () => {
    const r = computeCompoundInterest({
      principal: 0,
      monthlyContribution: 200,
      annualRatePercent: 6,
      years: 10,
    })!;
    // 200 × ((1 + i)^n − 1) ÷ i, con i = 0,06/12 e n = 120
    const i = 0.06 / 12;
    const atteso = 200 * ((Math.pow(1 + i, 120) - 1) / i);
    expect(r.futureValue).toBeCloseTo(atteso, 6);
    expect(r.totalContributed).toBeCloseTo(24_000, 6);
  });

  it('tasso zero: il montante è esattamente quanto si è versato', () => {
    const r = computeCompoundInterest({
      principal: 1_000,
      monthlyContribution: 100,
      annualRatePercent: 0,
      years: 5,
    })!;
    expect(r.futureValue).toBeCloseTo(1_000 + 100 * 60, 6);
    expect(r.totalInterest).toBeCloseTo(0, 6);
  });

  it('il tasso inserito è NOMINALE: 6 dà un effettivo annuo del 6,17%', () => {
    // Non è un dettaglio da nascondere: chi confronta due prodotti finanziari
    // sta confrontando numeri diversi se uno è nominale e l'altro effettivo.
    const r = computeCompoundInterest({
      principal: 1_000,
      monthlyContribution: 0,
      annualRatePercent: 6,
      years: 1,
    })!;
    expect(r.futureValue / 1_000 - 1).toBeCloseTo(0.06168, 5);
  });

  it('un tasso negativo erode il capitale invece di farlo crescere', () => {
    const r = computeCompoundInterest({
      principal: 10_000,
      monthlyContribution: 0,
      annualRatePercent: -10,
      years: 5,
    })!;
    expect(r.futureValue).toBeLessThan(10_000);
    expect(r.totalInterest).toBeLessThan(0);
  });
});

describe('coerenza interna', () => {
  it('interessi = montante − versato, sempre', () => {
    const r = computeCompoundInterest({
      principal: 3_000,
      monthlyContribution: 150,
      annualRatePercent: 7,
      years: 20,
    })!;
    expect(r.totalInterest).toBeCloseTo(r.futureValue - r.totalContributed, 6);
    for (const p of r.perYear) {
      expect(p.interest).toBeCloseTo(p.balance - p.contributed, 6);
    }
  });

  it('una riga per anno, e l’ultima coincide col totale', () => {
    const r = computeCompoundInterest({
      principal: 1_000,
      monthlyContribution: 50,
      annualRatePercent: 5,
      years: 12,
    })!;
    expect(r.perYear).toHaveLength(12);
    expect(r.perYear[0].year).toBe(1);
    const ultima = r.perYear[11];
    expect(ultima.year).toBe(12);
    expect(ultima.balance).toBeCloseTo(r.futureValue, 6);
    expect(ultima.contributed).toBeCloseTo(r.totalContributed, 6);
  });

  it('con un tasso positivo il montante cresce ogni anno', () => {
    const r = computeCompoundInterest({
      principal: 500,
      monthlyContribution: 100,
      annualRatePercent: 4,
      years: 15,
    })!;
    for (let i = 1; i < r.perYear.length; i++) {
      expect(r.perYear[i].balance).toBeGreaterThan(r.perYear[i - 1].balance);
    }
  });
});

describe('ingressi non validi', () => {
  const base = {
    principal: 1_000,
    monthlyContribution: 100,
    annualRatePercent: 5,
    years: 10,
  };

  it('non producono un numero', () => {
    expect(computeCompoundInterest({ ...base, years: 0 })).toBeNull();
    expect(computeCompoundInterest({ ...base, years: -1 })).toBeNull();
    expect(computeCompoundInterest({ ...base, years: 101 })).toBeNull();
    expect(computeCompoundInterest({ ...base, principal: -1 })).toBeNull();
    expect(computeCompoundInterest({ ...base, monthlyContribution: -1 })).toBeNull();
    expect(computeCompoundInterest({ ...base, annualRatePercent: NaN })).toBeNull();
  });

  it('un campo vuoto non vale zero: `parseLocaleNumber` restituisce NaN', () => {
    // Se valesse zero, il tasso lasciato in bianco diventerebbe «0%» senza
    // dirlo. Meglio nessun risultato di un risultato che nessuno ha chiesto.
    expect(parseLocaleNumber('')).toBeNaN();
    expect(computeCompoundInterest({ ...base, annualRatePercent: parseLocaleNumber('') })).toBeNull();
    expect(parseLocaleNumber('6,5'), 'la virgola decimale italiana').toBeCloseTo(6.5, 6);
  });
});

describe('geometria del grafico', () => {
  const r = computeCompoundInterest({
    principal: 5_000,
    monthlyContribution: 200,
    annualRatePercent: 6,
    years: 10,
  })!;

  it('parte dal capitale iniziale, non da zero', () => {
    // Partire da zero farebbe sembrare guadagnato anche quello che è stato messo.
    const s = serieGrafico(r.perYear, 5_000)!;
    expect(s.punti[0].anno).toBe(0);
    expect(s.punti[0].x).toBe(0);
    expect(s.punti[0].yVersato).toBeCloseTo(5_000 / s.massimo, 6);
    expect(s.punti[0].yVersato).toBe(s.punti[0].yTotale);
  });

  it('le coordinate restano fra 0 e 1 e l’ultima tocca il massimo', () => {
    const s = serieGrafico(r.perYear, 5_000)!;
    expect(s.punti).toHaveLength(11); // anno 0 + 10 anni
    for (const p of s.punti) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.yVersato).toBeLessThanOrEqual(p.yTotale);
      expect(p.yTotale).toBeLessThanOrEqual(1);
    }
    const ultimo = s.punti[s.punti.length - 1];
    expect(ultimo.x).toBe(1);
    expect(ultimo.yTotale).toBeCloseTo(1, 6);
    expect(s.massimo).toBeCloseTo(r.futureValue, 6);
  });

  it('a tasso zero le due aree coincidono: non c’è nessuna banda dorata', () => {
    const piatto = computeCompoundInterest({
      principal: 1_000,
      monthlyContribution: 100,
      annualRatePercent: 0,
      years: 5,
    })!;
    const s = serieGrafico(piatto.perYear, 1_000)!;
    for (const p of s.punti) {
      expect(p.yVersato).toBeCloseTo(p.yTotale, 9);
    }
  });

  it('niente da disegnare → null, non un grafico vuoto o pieno di NaN', () => {
    expect(serieGrafico([], 1_000)).toBeNull();
    const zero = computeCompoundInterest({
      principal: 0,
      monthlyContribution: 0,
      annualRatePercent: 5,
      years: 3,
    })!;
    expect(serieGrafico(zero.perYear, 0)).toBeNull();
    expect(serieGrafico(r.perYear, -1)).toBeNull();
  });
});
