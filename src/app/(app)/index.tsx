import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { PILLARS, RED_SUITS, type Role, radius, spacing, useTheme } from '@/theme';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  leader: 'Leader',
  collaborator: 'Collaboratore',
};

export default function Dashboard() {
  const { profile, isProfileLoading, signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento profilo…</ThemedText>
      </Screen>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Benvenuto';

  return (
    <Screen scroll>
      {/* Intestazione con emblema, saluto e badge ruolo */}
      <View style={styles.header}>
        <View style={[styles.eyeRing, { borderColor: colors.gold }]}>
          <View style={[styles.pupil, { backgroundColor: colors.accent }]} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="title">Ciao, {firstName}</ThemedText>
          {profile && (
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <ThemedText variant="caption" tone="muted">
                {ROLE_LABEL[profile.role]}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Sezione specifica per ruolo */}
      {profile?.role === 'admin' && (
        <Card style={{ gap: spacing.md }}>
          <ThemedText variant="heading">Pannello amministratore</ThemedText>
          <ThemedText tone="muted" variant="caption">
            Gestione utenti, ruoli e autorizzazioni della rete.
          </ThemedText>
          <Button title="Apri pannello admin" onPress={() => router.push('/admin')} />
        </Card>
      )}

      {profile?.role === 'leader' && (
        <Card style={{ gap: spacing.sm }}>
          <ThemedText variant="heading">La mia rete</ThemedText>
          <ThemedText tone="muted" variant="caption">
            Qui vedrai i tuoi collaboratori, i loro rinnovi e l'avanzamento formazione.
          </ThemedText>
        </Card>
      )}

      {profile?.role === 'collaborator' && (
        <Card style={{ gap: spacing.sm }}>
          <ThemedText variant="heading">Il mio spazio</ThemedText>
          <ThemedText tone="muted" variant="caption">
            Clienti, rinnovi e formazione: tutto in un unico posto.
          </ThemedText>
        </Card>
      )}

      {/* Azione rapida: scadenzario rinnovi (CRM) */}
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">Scadenzario rinnovi</ThemedText>
        <ThemedText tone="muted" variant="caption">
          Tieni d'occhio le scadenze e ricevi un avviso prima del rinnovo.
        </ThemedText>
        <Button title="Apri scadenzario" variant="secondary" onPress={() => router.push('/renewals')} />
      </Card>

      {/* Azione rapida: calcolatori */}
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">Calcolatori</ThemedText>
        <ThemedText tone="muted" variant="caption">
          Lottaggio e interesse composto — strumenti a scopo educativo.
        </ThemedText>
        <Button title="Apri calcolatori" variant="secondary" onPress={() => router.push('/calcolatori')} />
      </Card>

      {/* I quattro pilastri: Network è attivo (CRM), gli altri arrivano nelle prossime milestone */}
      <View style={styles.pillars}>
        {PILLARS.map((p) => {
          const href =
            p.key === 'network' ? '/clients' : p.key === 'formazione' ? '/formazione' : null;
          const active = href !== null;
          const card = (
            <Card style={styles.pillarCard}>
              <ThemedText style={[styles.suit, { color: RED_SUITS.has(p.suit) ? colors.accent : colors.text }]}>
                {p.suit}
              </ThemedText>
              <ThemedText variant="label">{p.label}</ThemedText>
              <ThemedText tone={active ? 'accent' : 'muted'} variant="caption">
                {active ? 'Apri →' : 'In arrivo'}
              </ThemedText>
            </Card>
          );
          return active ? (
            <Pressable
              key={p.key}
              style={styles.pillarItem}
              onPress={() => href && router.push(href)}
            >
              {card}
            </Pressable>
          ) : (
            <View key={p.key} style={styles.pillarItem}>
              {card}
            </View>
          );
        })}
      </View>

      <Button title="Esci" variant="secondary" onPress={() => void signOut()} />

      <ThemedText tone="muted" variant="caption" style={styles.disclaimer}>
        Contenuti a scopo educativo e informativo. Nessuna promessa di rendimento né consulenza
        finanziaria personalizzata.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  eyeRing: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  pillarItem: {
    flexBasis: '46%',
    flexGrow: 1,
  },
  pillarCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  suit: {
    fontSize: 28,
    lineHeight: 32,
  },
  disclaimer: {
    textAlign: 'center',
  },
});
