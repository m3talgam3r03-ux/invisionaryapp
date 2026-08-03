import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Renewal,
  RenewalHistoryEntry,
  RenewalInput,
  RenewalWithClient,
} from '@/types/models';

import { supabase } from './supabase';

const KEY = 'renewals';

/**
 * Scadenzario: rinnovi ordinati per scadenza crescente, con nome cliente.
 * Il perimetro lo decide la RLS — il collaboratore riceve solo i propri.
 */
export function useRenewals() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async (): Promise<RenewalWithClient[]> => {
      const { data, error } = await supabase
        .from('renewals')
        .select('*, client:clients(nome)')
        .order('current_due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RenewalWithClient[];
    },
  });
}

/** Storico di un rinnovo, dal più recente. Sola lettura: lo scrivono i trigger. */
export function useRenewalHistory(renewalId: string | undefined) {
  return useQuery({
    queryKey: [KEY, renewalId, 'history'],
    enabled: Boolean(renewalId),
    queryFn: async (): Promise<RenewalHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('renewal_history')
        .select('*')
        .eq('renewal_id', renewalId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RenewalHistoryEntry[];
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
      // Se cambia la scadenza il ciclo di avvisi riparte da solo: ci pensa il
      // trigger renewals_reset_reminders (migrazione 0013).
      const { data, error } = await supabase
        .from('renewals')
        .update(input)
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

/**
 * Approva un rinnovo portandolo a `nuovaScadenza`.
 * Chi non ha il diritto di approvare non riceve un errore: il guardiano del
 * database riclassifica la modifica come richiesta di approvazione. Per questo
 * l'interfaccia mostra il pulsante solo a chi può (`can(…, 'renewals.approve')`),
 * ma la decisione vera resta in Postgres.
 */
export function useApproveRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      nuovaScadenza,
    }: {
      id: string;
      nuovaScadenza: string;
    }): Promise<Renewal> => {
      const { data, error } = await supabase
        .from('renewals')
        .update({ current_due_date: nuovaScadenza, status: 'attivo' })
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
