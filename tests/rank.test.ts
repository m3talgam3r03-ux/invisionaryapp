/**
 * Test della presentazione del rank (src/lib/rank.ts).
 *
 * Il CALCOLO dei punti non sta più qui: lo fa il database con `rank_rules`, ed
 * è verificato in rls.test.ts. Qui resta ciò che serve a mostrarlo.
 */
import { describe, expect, it } from 'vitest';

import { progressoVersoProssimo, rankLabel } from '@/lib/rank';

describe('nomi dei livelli', () => {
  it('le figure hanno un nome italiano', () => {
    expect(rankLabel('A')).toBe('Asso');
    expect(rankLabel('K')).toBe('Re');
    expect(rankLabel('Q')).toBe('Donna');
    expect(rankLabel('J')).toBe('Jack');
  });

  it('i numeri restano numeri', () => {
    expect(rankLabel('2')).toBe('2');
    expect(rankLabel('10')).toBe('10');
  });

  it('un livello sconosciuto viene mostrato così com’è, senza rompersi', () => {
    // I livelli sono configurabili dal database: potrebbero non essere carte.
    expect(rankLabel('Diamante')).toBe('Diamante');
  });
});

describe('progresso verso il livello successivo', () => {
  it('a metà strada vale metà', () => {
    // 100 punti fatti, 100 mancanti → traguardo 200 → 50%
    expect(progressoVersoProssimo(100, 100)).toBeCloseTo(0.5);
  });

  it('quasi arrivato', () => {
    expect(progressoVersoProssimo(180, 20)).toBeCloseTo(0.9);
  });

  it('senza un livello successivo il progresso è pieno', () => {
    // È il caso dell'Asso: `punti_al_prossimo` arriva null dal database.
    expect(progressoVersoProssimo(2000, null)).toBe(1);
  });

  it('non va mai fuori dall’intervallo 0-1', () => {
    expect(progressoVersoProssimo(0, 50)).toBe(0);
    expect(progressoVersoProssimo(50, 0)).toBe(1);
    expect(progressoVersoProssimo(-10, 50)).toBe(0);
  });

  it('a punti zero e traguardo zero non divide per zero', () => {
    expect(Number.isFinite(progressoVersoProssimo(0, 0))).toBe(true);
  });
});
