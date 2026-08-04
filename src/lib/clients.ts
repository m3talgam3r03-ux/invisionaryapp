import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Client,
  ClientInput,
  ContactStato,
  ContactStatusHistoryEntry,
} from '@/types/models';

import { supabase } from './supabase';

const KEY = 'clients';

/**
 * Filtri della pipeline, tutti combinabili fra loro.
 * Campi lasciati vuoti = nessun vincolo su quella dimensione.
 */
export type ClientFilters = {
  stati?: ContactStato[];
  /** Contatti fermi da almeno N giorni. */
  fermoDaGiorni?: number;
  origine?: string;
  tags?: string[];
  /** Solo per leader e admin: restringe a un proprietario. */
  ownerId?: string;
  /** Ricerca libera su nome, contatto e prodotto. */
  cerca?: string;
};

/** Elenco clienti visibili all'utente (la RLS applica il perimetro). */
export function useClients(filtri: ClientFilters = {}) {
  return useQuery({
    queryKey: [KEY, filtri],
    queryFn: async (): Promise<Client[]> => {
      let q = supabase.from('clients').select('*');

      if (filtri.stati?.length) q = q.in('stato', filtri.stati);
      if (filtri.origine) q = q.eq('origine', filtri.origine);
      if (filtri.ownerId) q = q.eq('owner_id', filtri.ownerId);
      // `contains`: il contatto deve avere TUTTI i tag chiesti.
      if (filtri.tags?.length) q = q.contains('tags', filtri.tags);

      if (filtri.fermoDaGiorni != null) {
        const soglia = new Date();
        soglia.setDate(soglia.getDate() - filtri.fermoDaGiorni);
        q = q.lt('ultimo_contatto_at', soglia.toISOString());
      }

      if (filtri.cerca?.trim()) {
        const s = filtri.cerca.trim().replace(/[%,]/g, ' ');
        q = q.or(`nome.ilike.%${s}%,contatto.ilike.%${s}%,prodotto.ilike.%${s}%`);
      }

      const { data, error } = await q.order('ultimo_contatto_at', {
        ascending: false,
        nullsFirst: false,
      });
      if (error) throw error;
      return data as Client[];
    },
  });
}

/** Quanti contatti ci sono in ciascuna fase, sul perimetro visibile. */
export function useClientsPerStato() {
  return useQuery({
    queryKey: [KEY, 'per-stato'],
    queryFn: async (): Promise<Record<ContactStato, number>> => {
      const { data, error } = await supabase.from('clients').select('stato');
      if (error) throw error;
      const conteggi = {} as Record<ContactStato, number>;
      for (const r of data ?? []) {
        const s = r.stato as ContactStato;
        conteggi[s] = (conteggi[s] ?? 0) + 1;
      }
      return conteggi;
    },
  });
}

/** Storico dei passaggi di stato. Sola lettura: lo scrivono i trigger. */
export function useClientHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: [KEY, clientId, 'history'],
    enabled: Boolean(clientId),
    queryFn: async (): Promise<ContactStatusHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('contact_status_history')
        .select('*')
        .eq('client_id', clientId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactStatusHistoryEntry[];
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] }); // i clienti pesano sul rank
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] }); // i clienti pesano sul rank
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] }); // i clienti pesano sul rank
    },
  });
}
