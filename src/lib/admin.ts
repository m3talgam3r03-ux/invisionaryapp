import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Role } from '@/theme';
import type { Profile } from '@/types/models';

import { supabase } from './supabase';

/** Tutti i profili (visibili all'admin via RLS). */
export function useAllProfiles() {
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useProfileById(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-profile', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

/** Aggiorna ruolo e leader di un utente (solo admin, garantito da RLS + trigger). */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      role,
      leader_id,
    }: {
      id: string;
      role: Role;
      leader_id: string | null;
    }): Promise<void> => {
      const { error } = await supabase.from('profiles').update({ role, leader_id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-profile', variables.id] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['network-progress'] });
    },
  });
}
