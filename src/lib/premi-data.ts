import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { VocePodio } from './podio';
import type { Premio, StatoRiscatto, VocePunti } from './premi';

import { supabase } from './supabase';

export type Riscatto = {
  id: string;
  userId: string;
  premioNome: string;
  costoPunti: number;
  stato: StatoRiscatto;
  note: string | null;
  createdAt: string;
};

/** Il saldo, dalla colonna protetta dal CHECK. */
export function useSaldoPunti(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['punti-saldo', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('points_balance')
        .select('saldo')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? Number(data.saldo) : 0;
    },
  });
}

/** Il registro: è ciò che spiega il saldo, e va mostrato per intero. */
export function useRegistroPunti(userId: string | null | undefined, limite = 50) {
  return useQuery({
    queryKey: ['punti-registro', userId, limite],
    enabled: Boolean(userId),
    queryFn: async (): Promise<VocePunti[]> => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('id, delta, origine, motivo, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limite);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        delta: Number(r.delta),
        origine: r.origine as VocePunti['origine'],
        motivo: (r.motivo as string) ?? null,
        createdAt: r.created_at as string,
      }));
    },
  });
}

export function useCatalogo() {
  return useQuery({
    queryKey: ['premi-catalogo'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<Premio[]> => {
      const { data, error } = await supabase
        .from('reward_catalog')
        .select('id, nome, descrizione, costo_punti, disponibili, attivo')
        .eq('attivo', true)
        .order('ordine')
        .order('costo_punti');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        nome: r.nome as string,
        descrizione: (r.descrizione as string) ?? null,
        costoPunti: Number(r.costo_punti),
        disponibili: r.disponibili === null ? null : Number(r.disponibili),
        attivo: Boolean(r.attivo),
      }));
    },
  });
}

export function useMieiRiscatti(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['riscatti', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Riscatto[]> => {
      const { data, error } = await supabase
        .from('reward_redemptions')
        .select('id, user_id, reward_id, costo_punti, stato, note, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const righe = data ?? [];
      const nomi = await nomiPremi(righe.map((r) => r.reward_id as string));

      return righe.map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        premioNome: nomi.get(r.reward_id as string) ?? '—',
        costoPunti: Number(r.costo_punti),
        stato: r.stato as StatoRiscatto,
        note: (r.note as string) ?? null,
        createdAt: r.created_at as string,
      }));
    },
  });
}

async function nomiPremi(ids: string[]): Promise<Map<string, string>> {
  const unici = [...new Set(ids)];
  if (unici.length === 0) return new Map();
  const { data, error } = await supabase.from('reward_catalog').select('id, nome').in('id', unici);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.id as string, r.nome as string]));
}

/**
 * Riscatta un premio.
 *
 * Non c'è nessun controllo «ho abbastanza punti?» prima della chiamata, e non
 * servirebbe: fra il controllo e la scrittura passerebbe del tempo. A rifiutare
 * uno scoperto è il CHECK su `points_balance`, che è atomico — la stessa forma
 * usata per le prenotazioni. L'interfaccia nasconde il pulsante quando i punti
 * non bastano, ma è cortesia, non sicurezza.
 */
export function useRiscatta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (premioId: string) => {
      const { data, error } = await supabase.rpc('riscatta_premio', { p_reward: premioId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['punti-saldo'] });
      void qc.invalidateQueries({ queryKey: ['punti-registro'] });
      void qc.invalidateQueries({ queryKey: ['riscatti'] });
      void qc.invalidateQueries({ queryKey: ['premi-catalogo'] });
    },
  });
}

/**
 * Il podio del mese chiuso.
 *
 * Lo vede tutta la rete: `podio()` è SECURITY DEFINER perché deve restituire i
 * NOMI dei primi tre, e i profili altrui un collaboratore non li vede. Escono
 * solo posizione, nome e win rate — mai importi.
 */
export function usePodio(mese: string) {
  return useQuery({
    queryKey: ['podio', mese],
    // Un mese chiuso non cambia più: inutile richiederlo di continuo.
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<VocePodio[]> => {
      const { data, error } = await supabase.rpc('podio', { mese });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        posizione: Number(r.posizione),
        userId: r.user_id as string,
        nome: (r.nome as string) ?? '—',
        winRate: Number(r.win_rate),
        operazioni: Number(r.operazioni),
      }));
    },
  });
}

/** Quanti punti vale ogni posizione. In tabella: l'admin le cambia senza rilasci. */
export function useRegolePunti() {
  return useQuery({
    queryKey: ['punti-regole-classifica'],
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<Map<number, number>> => {
      const { data, error } = await supabase
        .from('points_classifica_regole')
        .select('posizione, punti')
        .order('posizione');
      if (error) throw error;
      return new Map((data ?? []).map((r) => [Number(r.posizione), Number(r.punti)] as const));
    },
  });
}
