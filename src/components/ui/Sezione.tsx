import { View } from 'react-native';

import { spacing } from '@/theme';

import { ThemedText } from './ThemedText';

/**
 * L'intestazione di un blocco.
 *
 * ── COSA È SPARITO ──
 * Il rombo oro e il filetto che attraversava la schermata. Erano un ornamento:
 * dicevano «qui comincia una sezione» aggiungendo due elementi grafici a ogni
 * blocco, e su una schermata con cinque sezioni diventavano cinque righe e
 * cinque rombi da guardare.
 *
 * Apple risolve la stessa cosa con **il testo e lo spazio**: l'intestazione è
 * solo una parola, e a separarla dal blocco precedente è il vuoto sopra. Meno
 * elementi, stessa informazione — e lo spazio non compete con niente.
 *
 * `descrizione` è nuovo: nelle liste raggruppate di iOS sotto il titolo può
 * esserci una riga che spiega. Prima ogni schermata la metteva a modo suo.
 */
export function Sezione({
  titolo,
  descrizione,
}: {
  titolo: string;
  descrizione?: string;
}) {
  return (
    <View style={{ gap: spacing.xs, marginTop: spacing.sm }} accessibilityRole="header">
      <ThemedText variant="heading">{titolo}</ThemedText>
      {descrizione ? (
        <ThemedText variant="caption" tone="muted">
          {descrizione}
        </ThemedText>
      ) : null}
    </View>
  );
}
