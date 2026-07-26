import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { netProfit, returnPct, useSyncAccounts, useTradingAccount, useTrades } from '@/lib/trading';
import { spacing } from '@/theme';
import type { Trade } from '@/types/models';

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('it-IT');
}

export default function TradingAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useTradingAccount(id);
  const trades = useTrades(id);
  const sync = useSyncAccounts();

  if (account.isLoading) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }
  if (account.isError || !account.data) {
    return (
      <Screen>
        <ThemedText tone="error">Account non trovato.</ThemedText>
      </Screen>
    );
  }

  const a = account.data;
  const list = trades.data ?? [];
  const net = netProfit(list);
  const ret = returnPct(net, a.balance);

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="title">{a.name ?? `${a.login}@${a.server}`}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {a.platform?.toUpperCase() ?? 'MT5'} · {a.state ?? '—'}
          {a.last_synced_at ? ` · agg. ${fmtDate(a.last_synced_at)}` : ''}
        </ThemedText>
      </View>

      <Card style={{ gap: spacing.sm }}>
        <ResultRow label="Saldo" value={a.balance != null ? `${formatNumber(a.balance)} ${a.currency ?? ''}` : '—'} />
        <ResultRow label="Equity" value={a.equity != null ? `${formatNumber(a.equity)} ${a.currency ?? ''}` : '—'} />
        <ResultRow label="Rendimento (stima)" value={`${formatNumber(ret, 2)} %`} accent />
      </Card>

      <Button
        title="Sincronizza questo account"
        variant="secondary"
        loading={sync.isPending}
        onPress={() => sync.mutate(a.id)}
      />
      {sync.isError && (
        <ThemedText tone="error" variant="caption">
          {sync.error instanceof Error ? sync.error.message : 'Sincronizzazione non riuscita.'}
        </ThemedText>
      )}

      <ThemedText variant="label" tone="muted">
        Operazioni ({list.length})
      </ThemedText>
      {trades.isLoading && <ThemedText tone="muted">Caricamento operazioni…</ThemedText>}
      {list.length === 0 && !trades.isLoading && (
        <ThemedText tone="muted" variant="caption">
          Nessuna operazione sincronizzata. Premi «Sincronizza» quando l'account è connesso.
        </ThemedText>
      )}
      {list.map((t) => (
        <TradeRow key={t.id} trade={t} />
      ))}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        Dati in sola lettura. Metriche in percentuale, non importi garantiti né consulenza finanziaria.
      </ThemedText>
    </Screen>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const isBuy = trade.type === 'DEAL_TYPE_BUY';
  const profit = trade.profit ?? 0;
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="heading">{trade.symbol ?? '—'}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {isBuy ? 'BUY' : 'SELL'} · {formatNumber(trade.volume ?? 0, 2)} · {fmtDate(trade.time)}
        </ThemedText>
      </View>
      <ThemedText tone={profit >= 0 ? 'success' : 'error'} variant="label">
        {formatNumber(profit, 2)}
      </ThemedText>
    </Card>
  );
}

function ResultRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
      <ThemedText tone="muted">{label}</ThemedText>
      <ThemedText variant={accent ? 'heading' : 'body'} tone={accent ? 'gold' : 'default'}>
        {value}
      </ThemedText>
    </View>
  );
}
