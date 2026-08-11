import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Budget, Memoria } from './agente';

import { supabase } from './supabase';

/**
 * Quello che l'agente ricorda di te.
 *
 * La RLS su `ai_memory` consente la lettura SOLO al diretto interessato —
 * nemmeno l'admin. Non sono dati di lavoro come i clienti nel CRM: sono
 * appunti presi da conversazioni private.
 */
export function useMemorie() {
  return useQuery({
    queryKey: ['ai-memoria'],
    queryFn: async (): Promise<Memoria[]> => {
      const { data, error } = await supabase
        .from('ai_memory')
        .select('id, fatto, categoria, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        fatto: r.fatto as string,
        categoria: r.categoria as Memoria['categoria'],
        createdAt: r.created_at as string,
      }));
    },
  });
}

/**
 * Dimentica un fatto.
 *
 * Si cancella, non si modifica: un ricordo sbagliato si toglie. Riscriverlo
 * significherebbe mettere in bocca all'agente qualcosa che non ha capito lui,
 * e da lì a iniettare istruzioni nel suo prompt il passo è corto.
 */
export function useDimentica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_memory').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-memoria'] });
    },
  });
}

/** Dimentica tutto. Chiede conferma a chi chiama: qui non si torna indietro. */
export function useDimenticaTutto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: sessione } = await supabase.auth.getUser();
      const io = sessione.user?.id;
      if (!io) throw new Error('Sessione scaduta.');
      const { error } = await supabase.from('ai_memory').delete().eq('user_id', io);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai-memoria'] });
    },
  });
}

/** Quanto hai consumato e quanto resta. */
export function useBudgetAgente() {
  return useQuery({
    queryKey: ['ai-budget'],
    // Corto: cambia a ogni domanda fatta.
    staleTime: 1000 * 30,
    queryFn: async (): Promise<Budget> => {
      const { data, error } = await supabase.rpc('budget_ai');
      if (error) throw error;
      const r = ((data ?? []) as Record<string, unknown>[])[0];
      return {
        richiesteOggi: Number(r?.richieste_oggi ?? 0),
        richiesteMax: Number(r?.richieste_max ?? 0),
        tokenMeseUsati: Number(r?.token_mese_usati ?? 0),
        tokenMeseMax: Number(r?.token_mese_max ?? 0),
      };
    },
  });
}
