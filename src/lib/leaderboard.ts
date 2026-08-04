import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/context/auth';
import type { Role } from '@/theme';

import { supabase } from './supabase';

/** Una riga della classifica, già calcolata dal database. */
export type LeaderboardEntry = {
  user_id: string;
  full_name: string;
  role: Role;
  punti: number;
  tier_name: string;
  tier_order: number;
  prossimo_tier: string | null;
  punti_al_prossimo: number | null;
  lezioni_completate: number;
  clienti_acquisiti: number;
  clienti_attivi: number;
  rinnovi_attivi: number;
};

/**
 * Classifica della rete.
 *
 * Arriva dalla funzione `classifica()`, non da una tabella: la vista
 * materializzata sotto NON ha RLS (Postgres non la applica alle matview), e il
 * perimetro lo impone quella funzione filtrando con can_read_member(). Per
 * questo qui non c'è nessun filtro da aggiungere — e non va aggirata leggendo
 * la matview, che infatti non è accessibile.
 */
export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('classifica');
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
  });
}

/** La riga dell'utente corrente, estratta dalla stessa classifica. */
export function useMyStats() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const board = useLeaderboard();

  return {
    ...board,
    data: userId ? board.data?.find((r) => r.user_id === userId) : undefined,
  };
}
