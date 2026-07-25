import { Redirect } from 'expo-router';
import { View, type DimensionValue } from 'react-native';

import { Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useNetworkProgress } from '@/lib/network';
import { spacing, useTheme, type Role } from '@/theme';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  leader: 'Leader',
  collaborator: 'Collaboratore',
};

export default function Rete() {
  const { profile, isProfileLoading } = useAuth();
  const { data, isLoading, isError, error } = useNetworkProgress();
  const { colors } = useTheme();

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }

  // Riservato a leader/admin.
  if (profile?.role === 'collaborator') {
    return <Redirect href="/formazione" />;
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText tone="muted" variant="caption">
        Avanzamento formazione della tua rete.
      </ThemedText>

      {isLoading && <ThemedText tone="muted">Caricamento…</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {error instanceof Error ? error.message : 'Errore nel caricamento.'}
        </ThemedText>
      )}
      {data?.members.length === 0 && (
        <ThemedText tone="muted">Nessun membro della rete da mostrare.</ThemedText>
      )}

      {data?.members.map((m) => {
        const pct = data.totalLessons > 0 ? Math.round((m.completed / data.totalLessons) * 100) : 0;
        return (
          <Card key={m.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ThemedText variant="heading" style={{ flex: 1 }}>
                {m.full_name || 'Senza nome'}
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
