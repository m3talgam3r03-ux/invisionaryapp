import { View } from 'react-native';

import { Card, Screen, ThemedText } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { useTraderLeaderboard } from '@/lib/trading';
import { spacing } from '@/theme';

export default function ClassificaTrader() {
  const { data, isLoading, isError, error } = useTraderLeaderboard();

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText tone="muted" variant="caption">
        Classifica per rendimento percentuale (stima). Perimetro deciso dalla RLS: leader → la
        propria rete, admin → tutti.
      </ThemedText>

      {isLoading && <ThemedText tone="muted">Caricamento classifica…</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {error instanceof Error ? error.message : 'Errore nel caricamento.'}
        </ThemedText>
      )}
      {data?.length === 0 && (
        <ThemedText tone="muted" variant="caption">
          Nessun account trading da classificare.
        </ThemedText>
      )}

      {data?.map((t, i) => (
        <Card key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <ThemedText tone="muted" variant="label" style={{ width: 22, textAlign: 'center' }}>
            {i + 1}
          </ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading">{t.name}</ThemedText>
            <ThemedText tone="muted" variant="caption">
              Netto: {formatNumber(t.netProfit, 2)} {t.currency ?? ''}
            </ThemedText>
          </View>
          <ThemedText tone={t.returnPct >= 0 ? 'success' : 'error'} variant="label">
            {formatNumber(t.returnPct, 2)} %
          </ThemedText>
        </Card>
      ))}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        Metriche in percentuale a scopo informativo, non importi garantiti né consulenza finanziaria.
      </ThemedText>
    </Screen>
  );
}
