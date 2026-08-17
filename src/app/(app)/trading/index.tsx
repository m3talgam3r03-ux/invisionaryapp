import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Card, EmptyState, Screen, ThemedText } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { useSyncAccounts, useTradingAccounts } from '@/lib/trading';
import { messaggioErrore } from '@/lib/errori';
import { spacing } from '@/theme';
import { t } from '@/i18n/it';

export default function Trading() {
  const router = useRouter();
  const { data: accounts, isLoading, isError, error } = useTradingAccounts();
  const sync = useSyncAccounts();

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button title={t.trading.collegaMt5} style={{ flex: 1 }} onPress={() => router.push('/trading/connetti')} />
        <Button
          title={t.trading.classificaAzione}
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push('/trading/classifica')}
        />
      </View>

      {accounts && accounts.length > 0 && (
        <Button
          title={t.trading.sincronizza}
          variant="secondary"
          loading={sync.isPending}
          onPress={() => sync.mutate(undefined)}
        />
      )}
      {sync.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(sync.error, t.trading.sincronizzaFallita)}
        </ThemedText>
      )}

      {isLoading && <ThemedText tone="muted">{t.trading.caricamentoAccount}</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {/* Qui c'era «verifica .env e la migrazione 0008», e compariva a
              QUALUNQUE errore: anche un timeout di rete. Chi usa l'app non ha
              un file .env e non sa cosa sia una migrazione. */}
          {messaggioErrore(error, t.trading.erroreAccount)}
        </ThemedText>
      )}
      {accounts?.length === 0 && (
        <EmptyState
          title={t.trading.nessunAccount}
          hint={t.trading.nessunAccountSuggerimento}
        />
      )}

      {accounts?.map((a) => (
        <Pressable
          accessibilityRole="button"
          key={a.id}
          onPress={() => router.push({ pathname: '/trading/[id]', params: { id: a.id } })}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Card style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ThemedText variant="heading" style={{ flex: 1 }}>
                {a.name ?? `${a.login}@${a.server}`}
              </ThemedText>
              <ThemedText tone="muted" variant="caption">
                {a.platform?.toUpperCase() ?? 'MT5'}
              </ThemedText>
            </View>
            <ThemedText tone="muted" variant="caption">
              {a.balance != null
                ? `Saldo: ${formatNumber(a.balance)} ${a.currency ?? ''}`
                : 'In attesa di sincronizzazione'}
              {a.state ? ` · ${a.state}` : ''}
            </ThemedText>
          </Card>
        </Pressable>
      ))}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        Solo lettura (investor password). Le metriche sono in percentuale e a scopo informativo, non
        importi garantiti né consulenza finanziaria.
      </ThemedText>
    </Screen>
  );
}
