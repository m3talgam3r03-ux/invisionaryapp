import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Card, Screen, ThemedText } from '@/components/ui';
import { checkSupabaseConnection, isSupabaseConfigured } from '@/lib/supabase';
import { BRAND, PILLARS, RED_SUITS, radius, spacing, useTheme } from '@/theme';

export default function LandingScreen() {
  const { colors } = useTheme();

  // Verifica connessione Supabase (solo se configurato). Dimostra Supabase + TanStack Query.
  const connection = useQuery({
    queryKey: ['supabase-health'],
    queryFn: checkSupabaseConnection,
    enabled: isSupabaseConfigured,
    retry: 0,
  });

  return (
    <Screen scroll>
      {/* Emblema: occhio (visione) + i quattro semi (mano vincente) */}
      <View style={styles.hero}>
        <View style={[styles.eyeRing, { borderColor: colors.gold }]}>
          <View style={[styles.pupil, { backgroundColor: colors.accent }]} />
        </View>

        <ThemedText tone="gold" variant="label">
          {BRAND.payoff}
        </ThemedText>
        <ThemedText variant="display" style={styles.wordmark}>
          {BRAND.name}
        </ThemedText>
        <ThemedText tone="muted" variant="caption" style={styles.tagline}>
          Network · Trading · Formazione — in un'unica squadra vincente.
        </ThemedText>
      </View>

      {/* I quattro pilastri mappati sui semi delle carte */}
      <View style={styles.pillars}>
        {PILLARS.map((p) => (
          <Card key={p.key} style={styles.pillarCard}>
            <ThemedText
              style={[styles.suit, { color: RED_SUITS.has(p.suit) ? colors.accent : colors.text }]}
            >
              {p.suit}
            </ThemedText>
            <ThemedText variant="label">{p.label}</ThemedText>
          </Card>
        ))}
      </View>

      {/* Stato connessione Supabase */}
      <Card style={styles.statusCard}>
        <ThemedText variant="label" tone="muted">
          Backend
        </ThemedText>
        <SupabaseStatus
          configured={isSupabaseConfigured}
          loading={connection.isLoading}
          error={connection.isError ? connection.error : null}
          ok={connection.isSuccess}
        />
      </Card>

      {/* Disclaimer di compliance (educativo, non consulenza finanziaria) */}
      <ThemedText tone="muted" variant="caption" style={styles.disclaimer}>
        Contenuti a scopo educativo e informativo. Nessuna promessa di rendimento né consulenza
        finanziaria personalizzata.
      </ThemedText>

      <ThemedText tone="muted" variant="mono" style={styles.milestone}>
        Milestone 1 · Scaffold
      </ThemedText>
    </Screen>
  );
}

function SupabaseStatus({
  configured,
  loading,
  error,
  ok,
}: {
  configured: boolean;
  loading: boolean;
  error: unknown;
  ok: boolean;
}) {
  if (!configured) {
    return (
      <ThemedText tone="muted">
        Non configurato — copia <ThemedText variant="mono">.env.example</ThemedText> in{' '}
        <ThemedText variant="mono">.env</ThemedText> e inserisci le credenziali Supabase.
      </ThemedText>
    );
  }
  if (loading) {
    return <ThemedText tone="muted">Verifica connessione in corso…</ThemedText>;
  }
  if (error) {
    const message = error instanceof Error ? error.message : 'errore sconosciuto';
    return <ThemedText tone="error">Non raggiungibile — {message}</ThemedText>;
  }
  if (ok) {
    return <ThemedText tone="success">● Supabase connesso</ThemedText>;
  }
  return <ThemedText tone="muted">—</ThemedText>;
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  eyeRing: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pupil: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
  },
  wordmark: {
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 320,
  },
  pillars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  pillarCard: {
    flexBasis: '46%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  suit: {
    fontSize: 28,
    lineHeight: 32,
  },
  statusCard: {
    gap: spacing.sm,
  },
  disclaimer: {
    textAlign: 'center',
  },
  milestone: {
    textAlign: 'center',
    opacity: 0.6,
  },
});
