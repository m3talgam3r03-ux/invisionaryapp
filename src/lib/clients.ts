import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Client, ClientInput } from '@/types/models';

import { supabase } from './supabase';

const KEY = 'clients';

/** Elenco clienti visibili all'utente (RLS applica il perimetro). */
export function useClients() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });
}

/** Singolo cliente per id. */
export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Client> => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as Client;
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientInput): Promise<Client> => {
      const { data, error } = await supabase.from('clients').insert(input).select().single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ClientInput & { id: string }): Promise<Client> => {
      const { data, error } = await supabase.from('clients').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, variables.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Inserimento massivo (import CSV/Excel). */
export function useImportClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ClientInput[]): Promise<number> => {
      const { data, error } = await supabase.from('clients').insert(rows).select('id');
      if (error) throw error;
      return data?.length ?? 0;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
