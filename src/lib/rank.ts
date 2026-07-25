import { RANKS, type Rank } from '@/theme';

/**
 * Sistema di rank a carte (2 → Asso) per l'avanzamento della rete.
 * Punteggio trasparente e configurabile: lezioni completate, clienti, rinnovi attivi.
 * L'oro è riservato a rank/traguardi (regola di brand).
 */
export const RANK_WEIGHTS = { lesson: 10, client: 5, renewal: 3 } as const;

export type StatCounts = { lessons: number; clients: number; renewals: number };

export function computePoints(c: StatCounts): number {
  return (
    c.lessons * RANK_WEIGHTS.lesson +
    c.clients * RANK_WEIGHTS.client +
    c.renewals * RANK_WEIGHTS.renewal
  );
}

/** Punti cumulativi necessari per raggiungere ciascun rank (indice 0 = "2"). */
export const RANK_THRESHOLDS = [0, 30, 70, 120, 180, 260, 360, 480, 620, 800, 1020, 1300, 1700];

/** Nomi italiani per le figure. */
const RANK_NAME: Partial<Record<Rank, string>> = { A: 'Asso', K: 'Re', Q: 'Donna', J: 'Jack' };
export function rankLabel(r: Rank): string {
  return RANK_NAME[r] ?? r;
}

export type RankInfo = {
  index: number;
  rank: Rank;
  isMax: boolean;
  nextRank: Rank | null;
  progress: number; // 0..1 verso il rank successivo
  toNext: number; // punti mancanti al rank successivo
  points: number;
};

export function rankForPoints(points: number): RankInfo {
  let i = 0;
  for (let k = 0; k < RANK_THRESHOLDS.length; k++) {
    if (points >= RANK_THRESHOLDS[k]) i = k;
    else break;
  }
  const isMax = i === RANKS.length - 1;
  const base = RANK_THRESHOLDS[i];
  const next = isMax ? base : RANK_THRESHOLDS[i + 1];
  const progress = isMax ? 1 : Math.max(0, Math.min(1, (points - base) / (next - base)));
  const toNext = isMax ? 0 : Math.max(0, next - points);
  return { index: i, rank: RANKS[i], isMax, nextRank: isMax ? null : RANKS[i + 1], progress, toNext, points };
}
