import { useQuery } from '@tanstack/react-query';

import type { Role } from '@/theme';

import { supabase } from './supabase';

export type NetworkMember = {
  id: string;
  full_name: string;
  role: Role;
  completed: number;
  total: number;
  percent: number;
};

export type NetworkProgress = {
  members: NetworkMember[];
};

/**
 * Avanzamento formazione della rete visibile all'utente.
 *
 * Le percentuali arrivano già calcolate dalla vista `v_avanzamento_globale`:
 * prima venivano ricostruite qui contando le righe, che è lo stesso conto fatto
 * in un posto sbagliato. Il perimetro lo decide la RLS — la vista usa
 * security_invoker, quindi il leader vede sé e i propri collaboratori, l'admin
 * tutti, e nessuno vede oltre.
 */
export function useNetworkProgress() {
  return useQuery({
    queryKey: ['network-progress'],
    queryFn: async (): Promise<NetworkProgress> => {
      const [profilesRes, avanzamentoRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role').order('full_name'),
        supabase.from('v_avanzamento_globale').select('user_id, completate, totale, percentuale'),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (avanzamentoRes.error) throw avanzamentoRes.error;

      const perUtente = new Map(
        (avanzamentoRes.data ?? []).map((r) => [
          r.user_id as string,
          {
            completed: r.completate as number,
            total: r.totale as number,
            percent: r.percentuale as number,
          },
        ]),
      );

      const members = (profilesRes.data ?? []).map((p) => {
        const a = perUtente.get(p.id as string);
        return {
          id: p.id as string,
          full_name: p.full_name as string,
          role: p.role as Role,
          completed: a?.completed ?? 0,
          total: a?.total ?? 0,
          percent: a?.percent ?? 0,
        };
      });

      return { members };
    },
  });
}
