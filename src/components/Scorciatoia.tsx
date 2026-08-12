import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

/**
 * Una destinazione della dashboard: icona, nome, e basta.
 *
 * PERCHÉ ESISTE. La dashboard era diventata una pila di dieci schede tutte
 * uguali — titolo, paragrafo, pulsante — una per ogni sezione aggiunta nel
 * tempo. Su un telefono voleva dire quattro schermate di scorrimento per
 * arrivare ai pilastri, che sono la cosa che si usa di più. Il paragrafo
 * spiegava una volta sola, e poi restava lì per sempre a occupare spazio.
 *
 * Qui la destinazione occupa un quarto di riga. Niente è stato tolto: le
 * sezioni sono tutte raggiungibili, ci stanno solo tutte insieme sotto gli
 * occhi invece che una sotto l'altra.
 *
 * `colore` serve a orientarsi, non a decorare: le sezioni che appartengono a un
 * pilastro portano il colore del loro seme.
 */
export function Scorciatoia({
  glifo,
  etichetta,
  colore,
  onPress,
}: {
  glifo: string;
  etichetta: string;
  colore?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      style={({ pressed }) => [styles.tocco, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View
        style={[
          styles.riquadro,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <ThemedText style={[styles.glifo, { color: colore ?? colors.textMuted }]}>
          {glifo}
        </ThemedText>
        <ThemedText variant="caption" numberOfLines={2} style={styles.etichetta}>
          {etichetta}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Quattro per riga sul telefono: sotto questa misura l'etichetta va a capo
  // due volte e diventa illeggibile.
  tocco: { flexBasis: '22%', flexGrow: 1, minWidth: 74 },
  riquadro: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 78,
  },
  glifo: { fontSize: 22, lineHeight: 26 },
  etichetta: { textAlign: 'center', fontSize: 11 },
});
