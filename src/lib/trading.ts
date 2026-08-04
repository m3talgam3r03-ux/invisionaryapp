import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/auth';
import type { TradingAccount, Trade } from '@/types/models';

import { supabase } from './supabase';

/** Profitto netto (profit + commissioni + swap). */
export function netProfit(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + (t.profit ?? 0) + (t.commission ?? 0) + (t.swap ?? 0), 0);
}

/** Rendimento % (stima): profitto netto / saldo. */
export function returnPct(net: number, balance: number | null): number {
  return balance && balance > 0 ? (net / balance) * 100 : 0;
}

export function useTradingAccounts() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ['trading-accounts', uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<TradingAccount[]> => {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('owner_id', uid as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TradingAccount[];
    },
  });
}

export function useTradingAccount(id: string | undefined) {
  return useQuery({
    queryKey: ['trading-account', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<TradingAccount> => {
      const { data, error } = await supabase.from('trading_accounts').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as TradingAccount;
    },
  });
}

export function useTrades(accountId: string | undefined) {
  return useQuery({
    queryKey: ['trades', accountId],
    enabled: Boolean(accountId),
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', accountId as string)
        .order('time', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Trade[];
    },
  });
}

export function useConnectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      login: string;
      password: string;
      server: string;
      platform: 'mt4' | 'mt5';
    }): Promise<{ id: string }> => {
      const { data, error } = await supabase.functions.invoke<{ id: string }>('mt5-connect', {
        body: input,
      });
      if (error) throw error;
      return data ?? { id: '' };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trading-accounts'] }),
  });
}

export function useSyncAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId?: string): Promise<{ synced: number }> => {
      const { data, error } = await supabase.functions.invoke<{ synced: number }>('mt5-sync', {
        body: accountId ? { accountId } : {},
      });
      if (error) throw error;
      return data ?? { synced: 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading-accounts'] });
      qc.invalidateQueries({ queryKey: ['trades'] });
      qc.invalidateQueries({ queryKey: ['trading-account'] });
      qc.invalidateQueries({ queryKey: ['trader-leaderboard'] });
    },
  });
}

/**
 * Una riga della classifica trader.
 *
 * ⚠️ Niente importi e niente percentuali di guadagno, per scelta di prodotto:
 * escono solo la quota di operazioni chiuse in utile e quante ne sono state
 * fatte. Profitti e rendimenti restano nel proprio conto, che è privato.
 */
export type TraderRanking = {
  user_id: string;
  full_name: string;
  vip_call_host: boolean;
  operazioni: number;
  win_rate: number;
  /** Falso finché non si raggiunge la soglia minima di operazioni del periodo. */
  classificato: boolean;
};

/**
 * Classifica trader per win rate del mese corrente.
 *
 * Il calcolo lo fa `classifica_trader()`, che applica anche i vincoli: solo
 * conti collegati a MetaApi, operazioni sotto la durata minima escluse, soglia
 * minima di operazioni, e parità risolta con profit factor. Il perimetro lo
 * impone la stessa funzione con can_read_member().
 */
export function useTraderLeaderboard() {
  return useQuery({
    queryKey: ['trader-leaderboard'],
    queryFn: async (): Promise<TraderRanking[]> => {
      const { data, error } = await supabase.rpc('classifica_trader');
      if (error) throw error;
      return (data ?? []) as TraderRanking[];
    },
  });
}

export type PodioVoce = {
  periodo: string;
  posizione: number;
  user_id: string;
  win_rate: number;
  trade_count: number;
};

/**
 * Podi mensili congelati. Una volta chiuso il mese non cambiano più: nuove
 * operazioni non riscrivono la storia.
 */
export function usePodi(limite = 3) {
  return useQuery({
    queryKey: ['podi', limite],
    queryFn: async (): Promise<PodioVoce[]> => {
      const { data, error } = await supabase
        .from('leaderboard_snapshots')
        .select('periodo, posizione, user_id, win_rate, trade_count')
        .order('periodo', { ascending: false })
        .order('posizione', { ascending: true })
        .limit(limite * 3);
      if (error) throw error;
      return (data ?? []) as PodioVoce[];
    },
  });
}
