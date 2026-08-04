import { useMemo } from 'react';
import { View } from 'react-native';

import { Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { formatNumber } from '@/lib/format';
import { useTraderLeaderboard, type TraderRanking } from '@/lib/trading';
import { spacing, useTheme } from '@/theme';

/** Soglia mostrata nella spiegazione; il valore vero è in `trading_config`. */
const SOGLIA_INDICATIVA = 20;

export default function ClassificaTrader() {
  const { data, isLoading, isError, error } = useTraderLeaderboard();
  const { session } = useAuth();

  const { classificati, esclusi } = useMemo(() => {
    const righe = data ?? [];
    return {
      classificati: righe.filter((r) => r.classificato),
      esclusi: righe.filter((r) => !r.classificato),
    };
  }, [data]);

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="title">{t.trading.classifica.titolo}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.trading.classifica.sottotitolo}
        </ThemedText>
      </View>

      {isLoading && <ThemedText tone="muted">{t.trading.classifica.caricamento}</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {error instanceof Error ? error.message : t.comune.errore}
        </ThemedText>
      )}
      {data?.length === 0 && (
        <ThemedText tone="muted" variant="caption">
          {t.trading.classifica.vuota}
        </ThemedText>
      )}

      {classificati.map((r, i) => (
        <Riga key={r.user_id} riga={r} posizione={i + 1} io={r.user_id === session?.user.id} />
      ))}

      {/* Chi non ha ancora abbastanza operazioni: mostrato, ma fuori classifica */}
      {esclusi.length > 0 && (
        <>
          <ThemedText variant="label" tone="muted" style={{ marginTop: spacing.md }}>
            {t.trading.classifica.nonClassificati}
          </ThemedText>
          <ThemedText tone="muted" variant="caption">
            {t.trading.classifica.sogliaSpiegazione(SOGLIA_INDICATIVA)}
          </ThemedText>
          {esclusi.map((r) => (
            <Riga key={r.user_id} riga={r} io={r.user_id === session?.user.id} />
          ))}
        </>
      )}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        {t.trading.classifica.disclaimer}
      </ThemedText>
    </Screen>
  );
}

function Riga({
  riga,
  posizione,
  io,
}: {
  riga: TraderRanking;
  posizione?: number;
  io: boolean;
}) {
  const { colors } = useTheme();
  // L'oro solo al podio: è la regola del marchio sui traguardi.
  const podio = posizione !== undefined && posizione <= 3;

  return (
    <Card
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderColor: io ? colors.accent : colors.border,
        opacity: posizione === undefined ? 0.75 : 1,
      }}
    >
      <ThemedText
        tone={podio ? 'gold' : 'muted'}
        variant="label"
        style={{ width: 26, textAlign: 'center' }}
      >
        {posizione !== undefined ? t.trading.classifica.posizione(posizione) : '—'}
      </ThemedText>

      <View style={{ flex: 1, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ThemedText variant="heading">{riga.full_name}</ThemedText>
          {riga.vip_call_host && (
            <ThemedText tone="gold" variant="caption">
              ♠ {t.trading.classifica.vipHost}
            </ThemedText>
          )}
        </View>
        <ThemedText tone="muted" variant="caption">
          {t.trading.classifica.operazioni(riga.operazioni)}
        </ThemedText>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText variant="label" tone={podio ? 'gold' : 'muted'}>
          {formatNumber(riga.win_rate, 1)}%
        </ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.trading.classifica.winRate}
        </ThemedText>
      </View>
    </Card>
  );
}
