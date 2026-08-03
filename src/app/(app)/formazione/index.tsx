import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Card, EmptyState, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { useCourses } from '@/lib/courses';
import { can } from '@/lib/permissions';
import { spacing } from '@/theme';

export default function FormazioneIndex() {
  const { data: courses, isLoading, isError, error } = useCourses();
  const { profile } = useAuth();
  const router = useRouter();
  const canSeeNetwork = can(profile, 'network.progress');

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button
          title={t.formazione.calendario}
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push('/formazione/calendario')}
        />
        {canSeeNetwork && (
          <Button
            title={t.formazione.avanzamentoRete}
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push('/formazione/rete')}
          />
        )}
      </View>

      {isLoading && <ThemedText tone="muted">{t.formazione.caricamentoCorsi}</ThemedText>}

      {isError && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText tone="error">{t.formazione.erroreCorsi}</ThemedText>
          <ThemedText tone="muted" variant="caption">
            {t.formazione.erroreCorsiDettaglio(
              error instanceof Error ? error.message : t.formazione.erroreSconosciuto,
            )}
          </ThemedText>
        </View>
      )}

      {courses?.length === 0 && (
        <EmptyState title={t.formazione.nessunCorso} hint={t.formazione.nessunCorsoSuggerimento} />
      )}

      {courses?.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => router.push({ pathname: '/formazione/[courseId]', params: { courseId: c.id } })}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Card style={{ gap: spacing.xs }}>
            <ThemedText variant="heading">{c.titolo}</ThemedText>
            {c.descrizione ? (
              <ThemedText tone="muted" variant="caption">
                {c.descrizione}
              </ThemedText>
            ) : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
