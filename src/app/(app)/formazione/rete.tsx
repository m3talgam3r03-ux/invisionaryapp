import { Redirect } from 'expo-router';
import { View, type DimensionValue } from 'react-native';

import { Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { useNetworkProgress } from '@/lib/network';
import { can } from '@/lib/permissions';
import { spacing, useTheme } from '@/theme';

export default function Rete() {
  const { profile, isProfileLoading } = useAuth();
  const { data, isLoading, isError, error } = useNetworkProgress();
  const { colors } = useTheme();

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">{t.comune.caricamento}</ThemedText>
      </Screen>
    );
  }

  // Riservato a chi guida la rete.
  if (!can(profile, 'network.progress')) {
    return <Redirect href="/formazione" />;
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText tone="muted" variant="caption">
        {t.formazione.rete.intro}
      </ThemedText>

      {isLoading && <ThemedText tone="muted">{t.comune.caricamento}</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {error instanceof Error ? error.message : t.comune.errore}
        </ThemedText>
      )}
      {data?.members.length === 0 && (
        <ThemedText tone="muted">{t.formazione.rete.nessunMembro}</ThemedText>
      )}

      {data?.members.map((m) => {
        const pct = data.totalLessons > 0 ? Math.round((m.completed / data.totalLessons) * 100) : 0;
        return (
          <Card key={m.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ThemedText variant="heading" style={{ flex: 1 }}>
                {m.full_name || t.comune.senzaNome}
              </ThemedText>
              <ThemedText tone="gold" variant="label">
                {m.completed}/{data.totalLessons}
              </ThemedText>
            </View>
            <ThemedText tone="muted" variant="caption">
              {ROLE_LABEL[m.role]} · {pct}%
            </ThemedText>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt }}>
              <View
                style={{
                  width: `${pct}%` as DimensionValue,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.gold,
                }}
              />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
