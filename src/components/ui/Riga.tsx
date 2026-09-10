import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { ThemedText } from './ThemedText';

type RigaProps = {
  /** Il glifo a sinistra. Piccolo: orienta, non decora. */
  glifo: string;
  titolo: string;
  /** Una riga sotto il titolo, quando il titolo da solo non basta. */
  dettaglio?: string;
  /** Colore del glifo. Serve a distinguere, non a colorare. */
  colore?: string;
  onPress: () => void;
  /** Ultima riga del gruppo: senza separatore sotto. */
  ultima?: boolean;
};

/**
 * Una riga di un elenco raggruppato, come in Impostazioni di iOS.
 *
 * ── PERCHÉ SERVE ──
 * Le destinazioni secondarie erano piastrelle in una griglia: sette quadrati
 * con un glifo e due parole. Una griglia dice «scegli», e obbliga a leggere
 * tutte le caselle prima di decidere. Un elenco dice «scorri», e si legge una
 * riga alla volta senza confrontarle fra loro.
 *
 * La differenza conta quando le voci sono più di quattro: sotto, la griglia
 * vince perché si abbraccia con lo sguardo; sopra, diventa un muro.
 *
 * ── IL SEPARATORE È RIENTRATO ──
 * Comincia dopo il glifo, non dal bordo. È il dettaglio che fa leggere un
 * elenco come un blocco unico invece che come righe impilate: l'occhio segue
 * la colonna dei titoli, e il filetto la accompagna invece di tagliarla.
 */
export function Riga({ glifo, titolo, dettaglio, colore, onPress, ultima = false }: RigaProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.riga,
        { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
      ]}
    >
      <ThemedText style={[styles.glifo, { color: colore ?? colors.textMuted }]}>{glifo}</ThemedText>

      <View style={styles.centro}>
        <View style={{ gap: 2, paddingVertical: spacing.md }}>
          <ThemedText variant="body">{titolo}</ThemedText>
          {dettaglio ? (
            <ThemedText variant="caption" tone="muted">
              {dettaglio}
            </ThemedText>
          ) : null}
        </View>
        {!ultima && <View style={[styles.filetto, { backgroundColor: colors.border }]} />}
      </View>

      <ThemedText tone="faint" style={styles.freccia}>
        ›
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  glifo: { width: 28, fontSize: 17, lineHeight: 22 },
  // Il centro tiene testo e separatore: così il filetto parte dal testo e non
  // dal bordo della scheda.
  centro: { flex: 1 },
  filetto: { height: StyleSheet.hairlineWidth },
  freccia: { fontSize: 20, marginLeft: spacing.sm },
});
