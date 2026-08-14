import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Crest } from '@/components/Crest';
import { DaFareAdesso } from '@/components/DaFareAdesso';
import { Scorciatoia } from '@/components/Scorciatoia';
import { ProgressBar } from '@/components/ProgressBar';
import { RankBadge } from '@/components/RankBadge';
import { Button, Card, Screen, ThemedText, Sezione } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { useMyStats } from '@/lib/leaderboard';
import { can } from '@/lib/permissions';
import { progressoVersoProssimo, rankLabel } from '@/lib/rank';
import { PILLARS, RED_SUITS, radius, spacing, useTheme } from '@/theme';

/** Dove porta ogni pilastro. Erano cinque ternari annidati dentro il render. */
const ROTTE_PILASTRI = {
  trading: '/trading',
  network: '/clients',
  formazione: '/formazione',
  community: '/community',
} as const;

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

      {/* I quattro pilastri, in cima: sono la cosa che si usa di più, e prima
          stavano in fondo a dieci schede di scorrimento. */}
      <View style={styles.pillars}>
        {PILLARS.map((p) => {
          const href = ROTTE_PILASTRI[p.key];
          const colore = RED_SUITS.has(p.suit) ? colors.accent : colors.text;
          return (
            <Pressable
              key={p.key}
              style={styles.pillarItem}
              accessibilityRole="button"
              accessibilityLabel={p.label}
              onPress={() => router.push(href)}
            >
              <Card style={styles.pillarCard}>
                <ThemedText style={[styles.suit, { color: colore }]}>{p.suit}</ThemedText>
                <ThemedText variant="label">{p.label}</ThemedText>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {/* Cosa richiede attenzione adesso.
          Qui c'era un riquadro che cambiava col ruolo e diceva, al leader,
          «qui vedrai i tuoi collaboratori, i loro rinnovi e l'avanzamento
          formazione»: una promessa, non un'informazione. Al collaboratore
          elencava i quattro pilastri disegnati due centimetri più su.
          Il pannello admin non si perde: sta nelle scorciatoie qui sotto. */}
      <DaFareAdesso />

      {/* Tutto il resto, in una griglia invece che in sette schede impilate.
          Ogni destinazione resta raggiungibile: cambia che ci stanno tutte
          sotto gli occhi, invece che una sotto l'altra. */}
      <View style={{ gap: spacing.sm }}>
        <Sezione titolo={t.dashboard.scorciatoie} />
        <View style={styles.scorciatoie}>
          <Scorciatoia
            glifo="◉"
            etichetta={t.dashboard.breve.agente}
            colore={colors.gold}
            onPress={() => router.push('/agente')}
          />
          <Scorciatoia
            glifo="◷"
            etichetta={scadenzario === t.dashboard.scadenzario
              ? t.dashboard.breve.scadenzario
              : t.dashboard.breve.scadenzarioMio}
            onPress={() => router.push('/renewals')}
          />
          <Scorciatoia
            glifo="∑"
            etichetta={t.dashboard.breve.calcolatori}
            onPress={() => router.push('/calcolatori')}
          />
          <Scorciatoia
            glifo="◴"
            etichetta={t.dashboard.breve.calendario}
            onPress={() => router.push('/calendario')}
          />
          <Scorciatoia
            glifo="★"
            etichetta={t.dashboard.breve.premi}
            colore={colors.gold}
            onPress={() => router.push('/premi')}
          />
          <Scorciatoia
            glifo="⬢"
            etichetta={t.dashboard.breve.mappa}
            colore={colors.accent}
            onPress={() => router.push('/mappa')}
          />
          {/* Il funnel era riservato a chi guida la rete. Il database non l'ha
              mai detto: `funnels_select` dà a ciascuno i PROPRI funnel, e
              `funnel_leads_select` dà a ciascuno i contatti che ha raccolto.
              Un collaboratore che fa network marketing è esattamente chi ha
              bisogno di una pagina che raccolga i suoi contatti: nasconderla
              rendeva il funnel uno strumento da leader, che non è. */}
          <Scorciatoia
            glifo="⌾"
            etichetta={t.dashboard.breve.funnel}
            colore={colors.accent}
            onPress={() => router.push('/funnel')}
          />
          {can(profile, 'admin.panel') && (
            <Scorciatoia
              glifo="⚙"
              etichetta={t.dashboard.breve.admin}
              onPress={() => router.push('/admin')}
            />
          )}
        </View>
      </View>

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
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  scorciatoie: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
