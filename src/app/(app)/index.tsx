import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { DaFareAdesso } from '@/components/DaFareAdesso';
import { Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { PILLARS, RED_SUITS, radius, spacing, useTheme } from '@/theme';

/** Dove porta ogni pilastro. */
const ROTTE_PILASTRI = {
  trading: '/trading',
  network: '/clients',
  formazione: '/formazione',
  community: '/community',
} as const;

/**
 * La home.
 *
 * ── COSA È SPARITO, E PERCHÉ ──
 * Offriva DIECI destinazioni: i quattro pilastri, sette scorciatoie in una
 * griglia, la scheda del rank. Non era una casa, era un lanciatore — e chi
 * apriva l'app doveva scegliere fra dieci cose prima di poterne fare una.
 *
 * Una schermata che chiede di scegliere non aiuta: la scelta costa, e la paga
 * ogni volta che si apre l'app. Adesso ne restano due:
 *
 *   1. **Cosa c'è da fare oggi.** In cima, perché è il motivo per cui si apre
 *      un'app di lavoro. Se non c'è niente lo dice, e va bene così.
 *   2. **I quattro pilastri.** Sono anche le quattro schede in basso: la
 *      ridondanza è voluta, perché sul telefono il pollice sta in basso ma
 *      l'occhio parte dall'alto.
 *
 * Tutto il resto sta in «Altro», dietro l'unico pulsante in alto a destra.
 * Non è nascosto: è messo via, che è un'altra cosa. Nove voci in un elenco si
 * scorrono; nove piastrelle in una griglia si devono confrontare.
 */
export default function Dashboard() {
  const { profile, isProfileLoading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">{t.comune.caricamentoProfilo}</ThemedText>
      </Screen>
    );
  }

  const nome = profile?.full_name?.split(' ')[0] || t.dashboard.benvenuto;

  return (
    <Screen scroll contentStyle={{ gap: spacing.xl }}>
      {/* Saluto e una sola uscita laterale */}
      <View style={styles.testa}>
        <ThemedText variant="title" style={{ flex: 1 }}>
          {t.dashboard.saluto(nome)}
        </ThemedText>
        <Pressable
          onPress={() => router.push('/altro')}
          accessibilityRole="button"
          accessibilityLabel={t.altro.titolo}
          hitSlop={10}
          style={({ pressed }) => [
            styles.altro,
            { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ThemedText variant="label">{t.altro.titolo}</ThemedText>
        </Pressable>
      </View>

      {/* Il motivo per cui si apre l'app */}
      <DaFareAdesso />

      {/* I quattro pilastri */}
      <View style={styles.pilastri}>
        {PILLARS.map((p) => (
          <Pressable
            key={p.key}
            style={styles.pilastro}
            accessibilityRole="button"
            accessibilityLabel={p.label}
            onPress={() => router.push(ROTTE_PILASTRI[p.key])}
          >
            <Card style={styles.scheda}>
              <ThemedText
                style={[styles.seme, { color: RED_SUITS.has(p.suit) ? colors.accent : colors.text }]}
              >
                {p.suit}
              </ThemedText>
              <ThemedText variant="label">{p.label}</ThemedText>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  testa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  altro: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  pilastri: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pilastro: { flexBasis: '46%', flexGrow: 1 },
  scheda: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  seme: { fontSize: 30, lineHeight: 34 },
});
