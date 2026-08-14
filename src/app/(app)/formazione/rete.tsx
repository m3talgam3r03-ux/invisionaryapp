import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { messaggioErrore } from '@/lib/errori';
import { useNetworkProgress } from '@/lib/network';
import { can } from '@/lib/permissions';
import { spacing } from '@/theme';

export default function Rete() {
  const { profile, isProfileLoading } = useAuth();
  const { data, isLoading, isError, error } = useNetworkProgress();

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
          {messaggioErrore(error, t.comune.errore)}
        </ThemedText>
      )}
      {data?.members.length === 0 && (
        <ThemedText tone="muted">{t.formazione.rete.nessunMembro}</ThemedText>
      )}

      {data?.members.map((m) => {
        // La percentuale arriva già calcolata dalla vista: qui non si conta nulla.
        const pct = m.percent;
        return (
          <Card key={m.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ThemedText variant="heading" style={{ flex: 1 }}>
                {m.full_name || t.comune.senzaNome}
              </ThemedText>
              <ThemedText tone="gold" variant="label">
                {m.completed}/{m.total}
              </ThemedText>
            </View>
            <ThemedText tone="muted" variant="caption">
              {ROLE_LABEL[m.role]} · {pct}%
            </ThemedText>
            <ProgressBar percent={pct} />
          </Card>
        );
      })}
    </Screen>
  );
}
