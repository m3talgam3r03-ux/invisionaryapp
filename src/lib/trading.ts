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

export type TraderRanking = {
  id: string;
  name: string;
  returnPct: number;
  netProfit: number;
  currency: string | null;
};

/** Classifica trader per rendimento % (perimetro deciso dalla RLS). */
export function useTraderLeaderboard() {
  return useQuery({
    queryKey: ['trader-leaderboard'],
    queryFn: async (): Promise<TraderRanking[]> => {
      const [accRes, trRes] = await Promise.all([
        supabase.from('trading_accounts').select('id, name, login, server, balance, currency'),
        supabase.from('trades').select('account_id, profit, commission, swap'),
      ]);
      if (accRes.error) throw accRes.error;
      if (trRes.error) throw trRes.error;

      const net = new Map<string, number>();
      for (const t of trRes.data ?? []) {
        const id = t.account_id as string | null;
        if (!id) continue;
        net.set(id, (net.get(id) ?? 0) + (Number(t.profit) || 0) + (Number(t.commission) || 0) + (Number(t.swap) || 0));
      }

      const rows: TraderRanking[] = (accRes.data ?? []).map((a) => {
        const id = a.id as string;
        const np = net.get(id) ?? 0;
        const balance = Number(a.balance) || 0;
        return {
          id,
          name: (a.name as string) || `${a.login}@${a.server}`,
          netProfit: np,
          returnPct: returnPct(np, balance),
          currency: (a.currency as string) ?? null,
        };
      });
      rows.sort((x, y) => y.returnPct - x.returnPct);
      return rows;
    },
  });
}
