import { useQuery } from '@tanstack/react-query';

import type { Role } from '@/theme';

import { supabase } from './supabase';

export type NetworkMember = {
  id: string;
  full_name: string;
  role: Role;
  completed: number;
};

export type NetworkProgress = {
  totalLessons: number;
  members: NetworkMember[];
};

/**
 * Avanzamento formazione della rete visibile all'utente.
 * La RLS decide il perimetro: il leader vede sé + i propri collaboratori, l'admin tutti.
 */
export function useNetworkProgress() {
  return useQuery({
    queryKey: ['network-progress'],
    queryFn: async (): Promise<NetworkProgress> => {
      const [profilesRes, lessonsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role').order('full_name'),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      const members = (profilesRes.data ?? []) as Pick<NetworkMember, 'id' | 'full_name' | 'role'>[];
      const ids = members.map((m) => m.id);

      const counts = new Map<string, number>();
      if (ids.length > 0) {
        const { data: progress, error } = await supabase
          .from('lesson_progress')
          .select('user_id')
          .in('user_id', ids);
        if (error) throw error;
        for (const row of progress ?? []) {
          const uid = row.user_id as string;
          counts.set(uid, (counts.get(uid) ?? 0) + 1);
        }
      }

      return {
        totalLessons: lessonsRes.count ?? 0,
        members: members.map((m) => ({ ...m, completed: counts.get(m.id) ?? 0 })),
      };
    },
  });
}
