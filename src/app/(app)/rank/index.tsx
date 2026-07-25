import { View, type DimensionValue } from 'react-native';

import { RankBadge } from '@/components/RankBadge';
import { Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useLeaderboard, useMyStats } from '@/lib/leaderboard';
import { rankForPoints, rankLabel } from '@/lib/rank';
import { spacing, useTheme, type Role } from '@/theme';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  leader: 'Leader',
  collaborator: 'Collaboratore',
};

export default function RankScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const stats = useMyStats();
  const board = useLeaderboard();

  const points = stats.data?.points ?? 0;
  const info = rankForPoints(points);

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* Il tuo rank */}
      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="label" tone="muted">
          Il tuo rank
        </ThemedText>
        {stats.isLoading ? (
          <ThemedText tone="muted">Calcolo del rank…</ThemedText>
        ) : stats.isError ? (
          <ThemedText tone="error" variant="caption">
            {stats.error instanceof Error ? stats.error.message : 'Errore.'}
          </ThemedText>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <RankBadge rank={info.rank} size={72} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <ThemedText variant="title" tone="gold">
                  {rankLabel(info.rank)}
                </ThemedText>
                <ThemedText tone="muted" variant="caption">
                  {points} punti
                </ThemedText>
              </View>
            </View>

            <View style={{ height: 7, borderRadius: 5, backgroundColor: colors.surfaceAlt }}>
              <View
                style={{
                  width: `${Math.round(info.progress * 100)}%` as DimensionValue,
                  height: 7,
                  borderRadius: 5,
                  backgroundColor: colors.gold,
                }}
              />
            </View>
            <ThemedText tone="muted" variant="caption">
              {info.isMax
                ? 'Sei un Asso — rango massimo. Continua così! 🃏'
                : `Prossimo: ${rankLabel(info.nextRank!)} · ${info.toNext} punti al traguardo.`}
            </ThemedText>

            {stats.data && (
              <ThemedText tone="muted" variant="caption">
                Punti = lezioni ({stats.data.lessons}×10) + clienti ({stats.data.clients}×5) + rinnovi
                attivi ({stats.data.renewals}×3).
              </ThemedText>
            )}
          </>
        )}
      </Card>

      {/* Classifica */}
      <ThemedText variant="label" tone="muted">
        Classifica della rete
      </ThemedText>
      {board.isLoading && <ThemedText tone="muted">Caricamento classifica…</ThemedText>}
      {board.isError && (
        <ThemedText tone="error" variant="caption">
          {board.error instanceof Error ? board.error.message : 'Errore nel caricamento.'}
        </ThemedText>
      )}
      {board.data?.map((m, i) => {
        const isMe = m.id === session?.user.id;
        return (
          <Card
            key={m.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              borderColor: isMe ? colors.accent : colors.border,
            }}
          >
            <ThemedText tone="muted" variant="label" style={{ width: 22, textAlign: 'center' }}>
              {i + 1}
            </ThemedText>
            <RankBadge rank={m.rank} size={40} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="heading">
                {m.full_name}
                {isMe ? ' · tu' : ''}
              </ThemedText>
              <ThemedText tone="muted" variant="caption">
                {ROLE_LABEL[m.role]}
              </ThemedText>
            </View>
            <ThemedText tone="gold" variant="label">
              {m.points} pt
            </ThemedText>
          </Card>
        );
      })}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        Avanzamento a scopo motivazionale. Le metriche di trading (in percentuale) arriveranno con
        l'integrazione MT5.
      </ThemedText>
    </Screen>
  );
}
