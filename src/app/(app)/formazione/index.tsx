import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useCourses } from '@/lib/courses';
import { spacing } from '@/theme';

export default function FormazioneIndex() {
  const { data: courses, isLoading, isError, error } = useCourses();
  const { profile } = useAuth();
  const router = useRouter();
  const canSeeNetwork = profile?.role === 'leader' || profile?.role === 'admin';

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button
          title="Calendario"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push('/formazione/calendario')}
        />
        {canSeeNetwork && (
          <Button
            title="Avanzamento rete"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push('/formazione/rete')}
          />
        )}
      </View>

      {isLoading && <ThemedText tone="muted">Caricamento corsi…</ThemedText>}

      {isError && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText tone="error">Impossibile caricare i corsi.</ThemedText>
          <ThemedText tone="muted" variant="caption">
            {error instanceof Error ? error.message : 'Errore sconosciuto'} — verifica .env e la
            migrazione 0004.
          </ThemedText>
        </View>
      )}

      {courses?.length === 0 && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="heading">Nessun corso</ThemedText>
          <ThemedText tone="muted" variant="caption">
            I corsi vengono gestiti dall'amministratore. Puoi caricare il seed dimostrativo.
          </ThemedText>
        </View>
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
