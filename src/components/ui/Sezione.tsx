import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '@/theme';

import { ThemedText } from './ThemedText';

/**
 * L'intestazione di un blocco dentro una schermata.
 *
 * Prima ogni schermata se la inventava: qualcuna usava `variant="label"`,
 * qualcuna `heading`, qualcuna niente. Il risultato è che due sezioni della
 * stessa app avevano peso diverso senza che ci fosse una ragione, e chi
 * scorreva non capiva dove finiva un blocco e cominciava il successivo.
 *
 * Il rombo e il filetto arrivano dall'anteprima: sono il segno che separa
 * senza aggiungere una riga di testo. Il rombo è oro perché è il colore che
 * nel marchio segna i traguardi, e qui segna i confini — usato piccolo, dove
 * non compete con nient'altro.
 */
export function Sezione({
  titolo,
  /** Un glifo al posto del rombo: il seme del pilastro, dove ce n'è uno. */
  glifo = '✦',
  /** Colore del glifo. Serve a orientarsi fra sezioni, non a decorare. */
  colore,
}: {
  titolo: string;
  glifo?: string;
  colore?: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.riga} accessibilityRole="header">
      <ThemedText style={[styles.glifo, { color: colore ?? colors.gold }]}>{glifo}</ThemedText>
      <ThemedText variant="label">{titolo}</ThemedText>
      <View style={[styles.filetto, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  glifo: { fontSize: 13, lineHeight: 17 },
  // Il filetto prende lo spazio che resta: separa senza disegnare una riga
  // intera che taglierebbe la schermata in due.
  filetto: { flex: 1, height: StyleSheet.hairlineWidth },
});
