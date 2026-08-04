import { useQuery } from '@tanstack/react-query';

import { supabase } from './supabase';

export type RankRule = {
  id: string;
  metric: string;
  points_per_unit: number;
  period: 'mensile' | 'totale';
  active: boolean;
};

/**
 * I pesi in vigore adesso, letti da `rank_rules`.
 *
 * Servono solo a MOSTRARE come si compone il punteggio: il calcolo lo fa il
 * database. Se un giorno i due divergessero, quello giusto è il database.
 */
export function useRankRules() {
  return useQuery({
    queryKey: ['rank-rules'],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('rank_rules')
        .select('metric, points_per_unit, active')
        .eq('active', true);
      if (error) throw error;
      return new Map(
        (data ?? []).map((r) => [r.metric as string, Number(r.points_per_unit)]),
      );
    },
  });
}
