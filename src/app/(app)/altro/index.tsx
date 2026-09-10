import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, Sezione, ThemedText } from '@/components/ui';
import { Riga } from '@/components/ui/Riga';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { can } from '@/lib/permissions';
import { spacing, useTheme } from '@/theme';

/**
 * Tutto quello che non sta nella barra in basso.
 *
 * ── PERCHÉ ESISTE ──
 * Prima queste nove destinazioni stavano sulla home, in una griglia di
 * piastrelle. Il risultato era una casa che non era una casa: era un
 * lanciatore con dieci porte, e chi apriva l'app doveva scegliere fra dieci
 * cose prima di poterne fare una.
 *
 * Adesso la home dice cosa c'è da fare oggi e mostra i quattro pilastri. Tutto
 * il resto vive qui, in un elenco raggruppato — che è il modo in cui iOS mette
 * via le cose che servono ogni tanto senza farle sparire.
 *
 * ── I GRUPPI NON SONO CASUALI ──
 * Primo: quello che si usa tutti i giorni. Secondo: dove si vede come si sta
 * andando. Terzo: gli strumenti. Ultimo: l'amministrazione, che riguarda una
 * persona sola. L'ordine è per frequenza d'uso, non per importanza — sono
 * cose diverse, e mescolarle è come si costruisce un menu illeggibile.
 */
export default function Altro() {
  const { profile, signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const vedeLaRete = can(profile, 'renewals.network');

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* Chi sei: qui, non sulla home, dove rubava spazio al saluto. */}
      {profile && (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="heading">{profile.full_name || t.comune.senzaNome}</ThemedText>
          <ThemedText variant="caption" tone="muted">
            {ROLE_LABEL[profile.role]}
          </ThemedText>
        </Card>
      )}

      {/* — Ogni giorno — */}
      <View style={{ gap: spacing.sm }}>
        <Sezione titolo={t.altro.ogniGiorno} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Riga
            glifo="◉"
            colore={colors.gold}
            titolo={t.dashboard.breve.agente}
            dettaglio={t.altro.agenteDettaglio}
            onPress={() => router.push('/agente')}
          />
          <Riga
            glifo="◷"
            titolo={vedeLaRete ? t.dashboard.breve.scadenzario : t.dashboard.breve.scadenzarioMio}
            dettaglio={vedeLaRete ? t.altro.scadenzarioDettaglio : t.altro.scadenzarioMioDettaglio}
            onPress={() => router.push('/renewals')}
          />
          <Riga
            glifo="◴"
            titolo={t.dashboard.breve.calendario}
            dettaglio={t.altro.calendarioDettaglio}
            onPress={() => router.push('/calendario')}
            ultima
          />
        </Card>
      </View>

      {/* — Come stai andando — */}
      <View style={{ gap: spacing.sm }}>
        <Sezione titolo={t.altro.comeVai} descrizione={t.altro.comeVaiSpiega} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Riga
            glifo="★"
            colore={colors.gold}
            titolo={t.dashboard.breve.rank}
            dettaglio={t.altro.rankDettaglio}
            onPress={() => router.push('/rank')}
          />
          <Riga
            glifo="◈"
            colore={colors.gold}
            titolo={t.dashboard.breve.premi}
            dettaglio={t.altro.premiDettaglio}
            onPress={() => router.push('/premi')}
            ultima
          />
        </Card>
      </View>

      {/* — Strumenti — */}
      <View style={{ gap: spacing.sm }}>
        <Sezione titolo={t.altro.strumenti} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Riga
            glifo="∑"
            titolo={t.dashboard.breve.calcolatori}
            dettaglio={t.altro.calcolatoriDettaglio}
            onPress={() => router.push('/calcolatori')}
          />
          <Riga
            glifo="⬢"
            colore={colors.accentText}
            titolo={t.dashboard.breve.mappa}
            dettaglio={t.altro.mappaDettaglio}
            onPress={() => router.push('/mappa')}
            ultima
          />
        </Card>
      </View>

      {/* — Amministrazione: una persona sola, in fondo — */}
      {can(profile, 'admin.panel') && (
        <View style={{ gap: spacing.sm }}>
          <Sezione titolo={t.altro.amministrazione} />
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <Riga
              glifo="⚙"
              titolo={t.dashboard.breve.admin}
              dettaglio={t.altro.adminDettaglio}
              onPress={() => router.push('/admin')}
              ultima
            />
          </Card>
        </View>
      )}

      <Button title={t.comune.esci} variant="secondary" onPress={() => void signOut()} />

      <ThemedText tone="faint" variant="caption" style={{ textAlign: 'center' }}>
        {t.dashboard.disclaimer}
      </ThemedText>
    </Screen>
  );
}
