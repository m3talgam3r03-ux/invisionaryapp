import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Crest } from '@/components/Crest';
import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { can } from '@/lib/permissions';
import { PILLARS, RED_SUITS, radius, spacing, useTheme } from '@/theme';

export default function Dashboard() {
  const { profile, isProfileLoading, signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">{t.comune.caricamentoProfilo}</ThemedText>
      </Screen>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || t.dashboard.benvenuto;

  return (
    <Screen scroll>
      {/* Intestazione con emblema, saluto e badge ruolo */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/agente')} accessibilityRole="button">
          <Crest size={58} />
        </Pressable>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="title">{t.dashboard.saluto(firstName)}</ThemedText>
          {profile && (
            <View style={[styles.badge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <ThemedText variant="caption" tone="muted">
                {ROLE_LABEL[profile.role]}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Riquadro che cambia con il ruolo: il testo arriva da i18n, l'azione dai permessi */}
      {profile && (
        <Card style={{ gap: spacing.md }}>
          <ThemedText variant="heading">{t.dashboard.perRuolo[profile.role].titolo}</ThemedText>
          <ThemedText tone="muted" variant="caption">
            {t.dashboard.perRuolo[profile.role].testo}
          </ThemedText>
          {can(profile, 'admin.panel') && (
            <Button title={t.dashboard.perRuolo.admin.azione} onPress={() => router.push('/admin')} />
          )}
        </Card>
      )}

      {/* Agente AI (feature di punta) */}
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">{t.dashboard.agente.titolo}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.dashboard.agente.testo}
        </ThemedText>
        <Button title={t.dashboard.agente.azione} onPress={() => router.push('/agente')} />
      </Card>

      {/* Azione rapida: scadenzario rinnovi (CRM) */}
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">{t.dashboard.scadenzario.titolo}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.dashboard.scadenzario.testo}
        </ThemedText>
        <Button
          title={t.dashboard.scadenzario.azione}
          variant="secondary"
          onPress={() => router.push('/renewals')}
        />
      </Card>

      {/* Azione rapida: calcolatori */}
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">{t.dashboard.calcolatori.titolo}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.dashboard.calcolatori.testo}
        </ThemedText>
        <Button
          title={t.dashboard.calcolatori.azione}
          variant="secondary"
          onPress={() => router.push('/calcolatori')}
        />
      </Card>

      {/* Rank a carte */}
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">{t.dashboard.rank.titolo}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.dashboard.rank.testo}
        </ThemedText>
        <Button
          title={t.dashboard.rank.azione}
          variant="secondary"
          onPress={() => router.push('/rank')}
        />
      </Card>

      {/* I quattro pilastri: Network è attivo (CRM), gli altri arrivano nelle prossime milestone */}
      <View style={styles.pillars}>
        {PILLARS.map((p) => {
          const href =
            p.key === 'trading'
              ? '/trading'
              : p.key === 'network'
                ? '/clients'
                : p.key === 'formazione'
                  ? '/formazione'
                  : p.key === 'community'
                    ? '/community'
                    : null;
          const active = href !== null;
          const card = (
            <Card style={styles.pillarCard}>
              <ThemedText style={[styles.suit, { color: RED_SUITS.has(p.suit) ? colors.accent : colors.text }]}>
                {p.suit}
              </ThemedText>
              <ThemedText variant="label">{p.label}</ThemedText>
              <ThemedText tone={active ? 'accent' : 'muted'} variant="caption">
                {active ? t.dashboard.pilastroApri : t.dashboard.pilastroInArrivo}
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

      <Button title={t.comune.esci} variant="secondary" onPress={() => void signOut()} />

      <ThemedText tone="muted" variant="caption" style={styles.disclaimer}>
        {t.dashboard.disclaimer}
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
