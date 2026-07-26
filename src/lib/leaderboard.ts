import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/context/auth';
import type { Role } from '@/theme';

import { computePoints, rankForPoints, type StatCounts } from './rank';
import { supabase } from './supabase';

/** Statistiche e rank dell'utente corrente. */
export function useMyStats() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['my-stats', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<StatCounts & { points: number }> => {
      const uid = userId as string;
      const [lessons, clients, renewals] = await Promise.all([
        supabase.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('owner_id', uid),
        supabase
          .from('renewals')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', uid)
          .eq('status', 'active'),
      ]);
      if (lessons.error) throw lessons.error;
      if (clients.error) throw clients.error;
      if (renewals.error) throw renewals.error;
      const counts: StatCounts = {
        lessons: lessons.count ?? 0,
        clients: clients.count ?? 0,
        renewals: renewals.count ?? 0,
      };
      return { ...counts, points: computePoints(counts) };
    },
  });
}

export type LeaderboardEntry = {
  id: string;
  full_name: string;
  role: Role;
  points: number;
  rank: string;
};

/** Classifica della rete visibile (la RLS scopa il perimetro: leader → collaboratori, admin → tutti). */
export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const [profiles, progress, clients, renewals] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role'),
        supabase.from('lesson_progress').select('user_id'),
        supabase.from('clients').select('owner_id'),
        supabase.from('renewals').select('owner_id').eq('status', 'active'),
      ]);
      if (profiles.error) throw profiles.error;
      if (progress.error) throw progress.error;
      if (clients.error) throw clients.error;
      if (renewals.error) throw renewals.error;

      const tally = (rows: Record<string, unknown>[] | null, key: string) => {
        const map = new Map<string, number>();
        for (const row of rows ?? []) {
          const id = row[key] as string;
          if (id) map.set(id, (map.get(id) ?? 0) + 1);
        }
        return map;
      };
      const L = tally(progress.data, 'user_id');
      const C = tally(clients.data, 'owner_id');
      const R = tally(renewals.data, 'owner_id');

      const members = (profiles.data ?? []).map((p) => {
        const counts: StatCounts = {
          lessons: L.get(p.id) ?? 0,
          clients: C.get(p.id) ?? 0,
          renewals: R.get(p.id) ?? 0,
        };
        const points = computePoints(counts);
        return {
          id: p.id as string,
          full_name: (p.full_name as string) || 'Senza nome',
          role: p.role as Role,
          points,
          rank: rankForPoints(points).rank,
        };
      });
      members.sort((a, b) => b.points - a.points);
      return members;
    },
  });
}
