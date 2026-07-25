import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Renewal, RenewalInput, RenewalWithClient } from '@/types/models';

import { supabase } from './supabase';

const KEY = 'renewals';

/** Scadenzario: rinnovi ordinati per data di scadenza (crescente), con nome cliente. */
export function useRenewals() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async (): Promise<RenewalWithClient[]> => {
      const { data, error } = await supabase
        .from('renewals')
        .select('*, client:clients(nome)')
        .order('scadenza', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RenewalWithClient[];
    },
  });
}

export function useRenewal(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Renewal> => {
      const { data, error } = await supabase.from('renewals').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as Renewal;
    },
  });
}

export function useCreateRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RenewalInput): Promise<Renewal> => {
      const { data, error } = await supabase.from('renewals').insert(input).select().single();
      if (error) throw error;
      return data as Renewal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: RenewalInput & { id: string }): Promise<Renewal> => {
      // Se si cambia la scadenza/stato, azzera reminder_sent_at per un nuovo ciclo di avvisi.
      const { data, error } = await supabase
        .from('renewals')
        .update({ ...input, reminder_sent_at: null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Renewal;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, variables.id] });
    },
  });
}

export function useDeleteRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('renewals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
