import { View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { RankBadge } from '@/components/RankBadge';
import { Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { useLeaderboard, useMyStats, type LeaderboardEntry } from '@/lib/leaderboard';
import { useRankRules } from '@/lib/rank-rules';
import { progressoVersoProssimo, rankLabel } from '@/lib/rank';
import { spacing, useTheme } from '@/theme';

export default function RankScreen() {
  const { session } = useAuth();
  const stats = useMyStats();
  const board = useLeaderboard();
  const { data: regole } = useRankRules();

  const me = stats.data;
  const punti = me?.punti ?? 0;
  const progresso = progressoVersoProssimo(punti, me?.punti_al_prossimo ?? null);
  const alMassimo = me?.punti_al_prossimo == null;

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* Il tuo rank */}
      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="label" tone="muted">
          {t.rank.tuoRank}
        </ThemedText>

        {stats.isLoading ? (
          <ThemedText tone="muted">{t.rank.calcolo}</ThemedText>
        ) : stats.isError ? (
          <ThemedText tone="error" variant="caption">
            {stats.error instanceof Error ? stats.error.message : t.comune.errore}
          </ThemedText>
        ) : me ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <RankBadge rank={me.tier_name} size={72} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <ThemedText variant="title" tone="gold">
                  {rankLabel(me.tier_name)}
                </ThemedText>
                <ThemedText tone="muted" variant="caption">
                  {t.rank.punti(punti)}
                </ThemedText>
              </View>
            </View>

            <ProgressBar percent={progresso * 100} height={7} />

            <ThemedText tone="muted" variant="caption">
              {alMassimo
                ? t.rank.massimo
                : t.rank.prossimo(rankLabel(me.prossimo_tier!), me.punti_al_prossimo!)}
            </ThemedText>

            {/* Le quattro metriche scomposte, coi pesi che valgono adesso */}
            <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
              <ThemedText variant="label" tone="muted">
                {t.rank.comeSiCalcola}
              </ThemedText>
              <Metrica nome="lezioni_completate" valore={me.lezioni_completate} regole={regole} />
              <Metrica nome="clienti_attivi" valore={me.clienti_attivi} regole={regole} />
              <Metrica nome="rinnovi_attivi" valore={me.rinnovi_attivi} regole={regole} />
              <Metrica nome="clienti_acquisiti" valore={me.clienti_acquisiti} regole={regole} />
            </View>
          </>
        ) : null}
      </Card>

      {/* Classifica */}
      <ThemedText variant="label" tone="muted">
        {t.rank.classifica}
      </ThemedText>

      {board.isLoading && <ThemedText tone="muted">{t.rank.caricamentoClassifica}</ThemedText>}
      {board.isError && (
        <ThemedText tone="error" variant="caption">
          {board.error instanceof Error ? board.error.message : t.comune.errore}
        </ThemedText>
      )}

      {board.data?.map((m, i) => (
        <RigaClassifica key={m.user_id} riga={m} posizione={i + 1} io={m.user_id === session?.user.id} />
      ))}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        {t.rank.disclaimer}
      </ThemedText>
    </Screen>
  );
}

/** Una metrica con quanto vale adesso: il peso arriva dal database, non dal codice. */
function Metrica({
  nome,
  valore,
  regole,
}: {
  nome: keyof typeof t.rank.metriche;
  valore: number;
  regole: Map<string, number> | undefined;
}) {
  const peso = regole?.get(nome);
  const contribuisce = peso != null && peso > 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <ThemedText tone="muted" variant="caption" style={{ flex: 1 }}>
        {t.rank.metriche[nome]}
      </ThemedText>
      <ThemedText tone="muted" variant="caption">
        {contribuisce ? `${valore} × ${peso}` : `${valore} · ${t.rank.pesoNullo}`}
      </ThemedText>
      {contribuisce && (
        <ThemedText variant="label" tone="gold" style={{ width: 56, textAlign: 'right' }}>
          {Math.round(valore * peso)}
        </ThemedText>
      )}
    </View>
  );
}

function RigaClassifica({
  riga,
  posizione,
  io,
}: {
  riga: LeaderboardEntry;
  posizione: number;
  io: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Card
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderColor: io ? colors.accent : colors.border,
      }}
    >
      <ThemedText tone="muted" variant="label" style={{ width: 22, textAlign: 'center' }}>
        {posizione}
      </ThemedText>
      <RankBadge rank={riga.tier_name} size={40} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="heading">
          {riga.full_name}
          {io ? t.rank.io : ''}
        </ThemedText>
        <ThemedText tone="muted" variant="caption">
          {ROLE_LABEL[riga.role]}
        </ThemedText>
      </View>
      <ThemedText tone="gold" variant="label">
        {Math.round(riga.punti)} pt
      </ThemedText>
    </Card>
  );
}
