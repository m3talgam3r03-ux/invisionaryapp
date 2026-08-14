import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Card, Screen, ThemedText } from '@/components/ui';
import { spacing } from '@/theme';

export default function CalcolatoriIndex() {
  const router = useRouter();

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/calcolatori/lottaggio')}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="heading">Calcolatore lottaggio</ThemedText>
          <ThemedText tone="muted" variant="caption">
            Dimensione della posizione in base a saldo, rischio % e stop loss.
          </ThemedText>
        </Card>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/calcolatori/interesse-composto')}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="heading">Interesse composto</ThemedText>
          <ThemedText tone="muted" variant="caption">
            Proiezione del montante con versamenti periodici.
          </ThemedText>
        </Card>
      </Pressable>

      <ThemedText tone="muted" variant="caption">
        Strumenti a scopo educativo. I risultati sono stime, non consulenza finanziaria.
      </ThemedText>
    </Screen>
  );
}
