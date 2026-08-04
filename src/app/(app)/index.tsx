import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Crest } from '@/components/Crest';
import { ProgressBar } from '@/components/ProgressBar';
import { RankBadge } from '@/components/RankBadge';
import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { useMyStats } from '@/lib/leaderboard';
import { can } from '@/lib/permissions';
import { progressoVersoProssimo, rankLabel } from '@/lib/rank';
import { PILLARS, RED_SUITS, radius, spacing, useTheme } from '@/theme';

export default function Dashboard() {
  const { profile, isProfileLoading, signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  // Tutti gli hook prima di qualunque return: l'ordine deve restare identico a
  // ogni render, altrimenti React si perde.
  const { data: mioRank } = useMyStats();

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">{t.comune.caricamentoProfilo}</ThemedText>
      </Screen>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || t.dashboard.benvenuto;
  // Chi non vede la rete trova «I miei rinnovi» al posto dello scadenzario.
  const scadenzario = can(profile, 'renewals.network')
    ? t.dashboard.scadenzario
    : t.dashboard.scadenzarioMio;

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

      {/* Rinnovi: al collaboratore solo i propri, senza lo scadenzario della rete */}
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">{scadenzario.titolo}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {scadenzario.testo}
        </ThemedText>
        <Button
          title={scadenzario.azione}
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

      {/* Rank a carte: punti e distanza dal livello successivo, a colpo d'occhio */}
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <ThemedText variant="heading">{t.dashboard.rank.titolo}</ThemedText>
            {mioRank ? (
              <ThemedText tone="muted" variant="caption">
                {t.rank.punti(Math.round(mioRank.punti))}
                {mioRank.punti_al_prossimo != null
                  ? ` · ${t.rank.prossimo(rankLabel(mioRank.prossimo_tier!), mioRank.punti_al_prossimo)}`
                  : ` · ${t.rank.massimo}`}
              </ThemedText>
            ) : (
              <ThemedText tone="muted" variant="caption">
                {t.dashboard.rank.testo}
              </ThemedText>
            )}
          </View>
          {mioRank && <RankBadge rank={mioRank.tier_name} size={48} />}
        </View>

        {mioRank && (
          <ProgressBar
            percent={progressoVersoProssimo(mioRank.punti, mioRank.punti_al_prossimo) * 100}
          />
        )}

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
