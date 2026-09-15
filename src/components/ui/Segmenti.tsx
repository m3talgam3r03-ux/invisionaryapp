import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { ThemedText } from './ThemedText';

export type Segmento<T extends string> = {
  valore: T;
  etichetta: string;
};

type SegmentiProps<T extends string> = {
  segmenti: readonly Segmento<T>[];
  valore: T;
  onCambia: (valore: T) => void;
  /** Descrive il gruppo a chi usa il lettore di schermo. */
  etichettaGruppo?: string;
};

/**
 * Il controllo a segmenti.
 *
 * ── PERCHE' ESISTE ──
 * E' il modo in cui iOS mette due o tre viste dello stesso argomento nello
 * stesso posto: Fitness lo usa per Riepilogo/Condivisione/Allenamenti, Salute
 * per il periodo, Wallet per le transazioni.
 *
 * La differenza con delle schede in fondo o con tre voci in un elenco non e'
 * estetica, e' di significato. Le schede dicono «tre posti diversi». I
 * segmenti dicono «un posto solo, tre modi di guardarlo» — ed e' esattamente
 * il rapporto fra livello, classifiche e premi, che finora l'app teneva in tre
 * schermate e provava a spiegare con un avviso scritto.
 *
 * ── IL CURSORE SI MUOVE ──
 * Non cambia colore: scivola. Il movimento e' quello che fa capire che i
 * segmenti sono UNA cosa con tre posizioni e non tre pulsanti indipendenti, e
 * costa una molla. Senza, e' una fila di rettangoli che si accendono.
 */
export function Segmenti<T extends string>({
  segmenti,
  valore,
  onCambia,
  etichettaGruppo,
}: SegmentiProps<T>) {
  const { colors, isDark } = useTheme();
  const [larghezza, setLarghezza] = useState(0);
  // Inizializzazione pigra: `new Animated.Value()` a ogni render creerebbe un
  // valore nuovo e l'animazione ripartirebbe da capo ogni volta.
  const [scorrimento] = useState(() => new Animated.Value(0));

  const indice = Math.max(
    0,
    segmenti.findIndex((s) => s.valore === valore),
  );
  const passo = larghezza > 0 ? (larghezza - 4) / segmenti.length : 0;

  // L'animazione sta in un effetto, non nel render: far partire una molla
  // mentre React sta disegnando e' un effetto collaterale in mezzo al disegno,
  // e con il render concorrente puo' partire due volte o non partire affatto.
  //
  // Parte solo a larghezza nota, altrimenti il cursore scivolerebbe da sinistra
  // al primo disegno anche quando il segmento attivo e' l'ultimo.
  useEffect(() => {
    if (passo <= 0) return;
    Animated.spring(scorrimento, {
      toValue: indice * passo,
      useNativeDriver: true,
      stiffness: 220,
      damping: 26,
      mass: 0.7,
    }).start();
  }, [indice, passo, scorrimento]);

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={etichettaGruppo}
      onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)}
      style={[styles.pista, { backgroundColor: colors.surfaceAlt }]}
    >
      {passo > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cursore,
            {
              width: passo,
              backgroundColor: colors.surface,
              transform: [{ translateX: scorrimento }],
              shadowOpacity: isDark ? 0.45 : 0.1,
            },
          ]}
        />
      )}

      {segmenti.map((s) => {
        const attivo = s.valore === valore;
        return (
          <Pressable
            key={s.valore}
            accessibilityRole="tab"
            accessibilityState={{ selected: attivo }}
            accessibilityLabel={s.etichetta}
            onPress={() => onCambia(s.valore)}
            style={styles.segmento}
          >
            <ThemedText
              variant="label"
              numberOfLines={1}
              style={{ color: attivo ? colors.text : colors.textMuted }}
            >
              {s.etichetta}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pista: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    padding: 2,
  },
  cursore: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: radius.sm - 2,
    shadowColor: '#000',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  segmento: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
