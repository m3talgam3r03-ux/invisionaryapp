import { useQuery } from '@tanstack/react-query';

import type { EventItem } from '@/types/models';

import { supabase } from './supabase';

/** Calendario formazione: eventi ordinati per data di inizio. */
export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<EventItem[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });
      if (error) throw error;
      return data as EventItem[];
    },
  });
}
