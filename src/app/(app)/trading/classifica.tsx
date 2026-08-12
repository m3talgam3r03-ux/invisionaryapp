import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Podio } from '@/components/Podio';
import { Button, Card, Screen, ThemedText, Sezione } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { formatNumber } from '@/lib/format';
import { etichettaMese, mesePrecedente, posizioniPremiate, puntiPerPosizione } from '@/lib/podio';
import { usePodio, useRegolePunti, useSaldoPunti } from '@/lib/premi-data';
import { useTraderLeaderboard, type TraderRanking } from '@/lib/trading';
import { spacing, useTheme } from '@/theme';

/** Soglia mostrata nella spiegazione; il valore vero è in `trading_config`. */
const SOGLIA_INDICATIVA = 20;

export default function ClassificaTrader() {
  const { data, isLoading, isError, error } = useTraderLeaderboard();
  const { session, profile } = useAuth();

  // Il podio è del mese CHIUSO: quello in corso cambia sotto gli occhi e non
  // direbbe a nessuno chi ha vinto davvero.
  const [mese] = useState(() => mesePrecedente(new Date()));
  const { data: podio } = usePodio(mese);
  const { data: regole } = useRegolePunti();
  const { data: saldo = 0 } = useSaldoPunti(profile?.id);

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

      {/* Il podio del mese chiuso, e i punti che si portano a casa */}
      <View style={{ gap: spacing.sm }}>
        <Sezione titolo={t.podio.titolo(etichettaMese(mese))} />
        <Card style={{ gap: spacing.md, paddingBottom: 0 }}>
          <Podio voci={podio ?? []} />
        </Card>
      </View>

      {/* Il proprio saldo e la via per spenderlo */}
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="label" tone="muted">
              {t.premi.saldo}
            </ThemedText>
            <ThemedText tone="gold" variant="title">
              {t.premi.punti(formatNumber(saldo, 0))}
            </ThemedText>
          </View>
          <Button
            title={t.trading.classifica.riscatta}
            variant="secondary"
            onPress={() => router.push('/premi')}
          />
        </View>
        {regole && posizioniPremiate(regole) > 0 && (
          <ThemedText tone="muted" variant="caption">
            {t.podio.comeSiVincono(
              posizioniPremiate(regole),
              formatNumber(puntiPerPosizione(regole, 1), 0),
            )}
          </ThemedText>
        )}
        <ThemedText tone="muted" variant="caption">
          {t.podio.nota}
        </ThemedText>
      </Card>

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
        <Riga
          key={r.user_id}
          riga={r}
          posizione={i + 1}
          io={r.user_id === session?.user.id}
          punti={regole ? puntiPerPosizione(regole, i + 1) : 0}
        />
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
  punti = 0,
}: {
  riga: TraderRanking;
  posizione?: number;
  io: boolean;
  /** Punti premio che questa posizione porta a casa. Zero = fuori dai premiati. */
  punti?: number;
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ThemedText tone="muted" variant="caption">
            {t.trading.classifica.operazioni(riga.operazioni)}
          </ThemedText>
          {/* Cosa porta a casa questa posizione: è l'informazione che manca
              guardando una classifica, e va accanto al nome, non altrove. */}
          {punti > 0 && (
            <ThemedText tone="gold" variant="caption">
              · {t.trading.classifica.puntiPosizione(formatNumber(punti, 0))}
            </ThemedText>
          )}
        </View>
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
