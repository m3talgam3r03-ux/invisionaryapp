import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MappaItalia } from '@/components/MappaItalia';
import { Card, Screen, ThemedText, Sezione } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { messaggioErrore } from '@/lib/errori';
import { NOMI_REGIONI, costruisciMappa, regionePiuAffollata, testoRiepilogo } from '@/lib/mappa';
import { useImpostaRegione, useMappaIscritti, useRiepilogoMappa } from '@/lib/mappa-data';
import { radius, spacing, useTheme } from '@/theme';

export default function Mappa() {
  const { profile } = useAuth();
  const { data: conteggi, isLoading, isError, error } = useMappaIscritti();
  const { data: riepilogo } = useRiepilogoMappa();
  const imposta = useImpostaRegione();

  const [apriScelta, setApriScelta] = useState(false);
  const regioni = useMemo(() => costruisciMappa(conteggi ?? []), [conteggi]);
  const prima = useMemo(() => regionePiuAffollata(conteggi ?? []), [conteggi]);

  const mia = profile?.regione ?? null;

  // `larga`: incolonnare una mappa la rimpicciolirebbe e basta; qui il
  // limite è più generoso perché il disegno ha bisogno di respiro.
  return (
    <Screen scroll larga contentStyle={{ gap: spacing.lg, maxWidth: 900, alignSelf: 'center' }}>
      <ThemedText tone="muted" variant="caption">
        {t.mappa.sottotitolo}
      </ThemedText>

      {isLoading ? (
        <ThemedText tone="muted">{t.comune.caricamento}</ThemedText>
      ) : isError ? (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(error, t.comune.errore)}
        </ThemedText>
      ) : (
        <Card style={{ gap: spacing.md }}>
          <MappaItalia regioni={regioni} />
        </Card>
      )}

      {riepilogo && (
        <ThemedText tone="muted" variant="caption">
          {testoRiepilogo(riepilogo)}
        </ThemedText>
      )}

      {prima && (
        <ThemedText variant="caption" tone="gold">
          {t.mappa.primaRegione(prima.regione, prima.iscritti ?? 0)}
        </ThemedText>
      )}

      {/* La propria regione: si vede la mappa e ci si aggiunge da lì */}
      <View style={{ gap: spacing.sm }}>
        <Sezione titolo={t.mappa.tuaRegione} />
        <Pressable
          onPress={() => setApriScelta((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`${t.mappa.tuaRegione}: ${mia ?? t.mappa.nessunaScelta}`}
          accessibilityState={{ expanded: apriScelta }}
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ThemedText style={{ flex: 1 }} tone={mia ? 'default' : 'muted'}>
              {mia ?? t.mappa.nonIndicata}
            </ThemedText>
            <ThemedText tone="muted">{apriScelta ? '⌃' : '⌄'}</ThemedText>
          </Card>
        </Pressable>

        {/* Se il salvataggio non va, va detto: la scheda si chiude comunque e
            senza un messaggio sembra che la scelta sia stata registrata. */}
        {imposta.isError && (
          <ThemedText tone="error" variant="caption">
            {messaggioErrore(imposta.error, t.mappa.regioneNonSalvata)}
          </ThemedText>
        )}

        {apriScelta && (
          <ScrollView
            horizontal={false}
            style={{ maxHeight: 260 }}
            contentContainerStyle={styles.elenco}
          >
            {NOMI_REGIONI.map((nome) => (
              <Chip
                key={nome}
                label={nome}
                selezionato={mia === nome}
                onPress={() => {
                  imposta.mutate(mia === nome ? null : nome);
                  setApriScelta(false);
                }}
              />
            ))}
          </ScrollView>
        )}

        <ThemedText tone="muted" variant="caption">
          {t.mappa.facoltativa}
        </ThemedText>
      </View>

      <ThemedText tone="muted" variant="caption">
        {t.mappa.privacy}
      </ThemedText>

      {/* CC BY 4.0: il credito va dove l'opera si vede, non in un file di
          licenze che nessuno apre. È l'unica cosa che quella licenza chiede. */}
      <ThemedText tone="muted" variant="caption">
        {t.mappa.crediti}
      </ThemedText>
    </Screen>
  );
}

function Chip({
  label,
  selezionato,
  onPress,
}: {
  label: string;
  selezionato: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: selezionato }}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selezionato ? colors.accent : colors.border,
        backgroundColor: selezionato ? colors.accent : colors.surface,
      }}
    >
      <ThemedText variant="caption" style={{ color: selezionato ? '#FFFFFF' : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  elenco: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
