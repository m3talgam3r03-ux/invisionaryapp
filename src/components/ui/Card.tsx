import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

/**
 * Superficie del design system: sfondo, bordo sottile, angoli arrotondati.
 *
 * ── PERCHÉ HA UN'OMBRA ──
 * Prima era una superficie piatta con un filetto: su uno sfondo quasi dello
 * stesso colore le schede non si staccavano, e una schermata leggeva come
 * un'unica massa grigia in cui bisognava cercare i confini. L'ombra è appena
 * accennata — non serve a fare effetto, serve a far capire che quella è una
 * scheda e finisce lì.
 *
 * Su Android `elevation` disegna anche uno sfondo proprio: per questo il
 * colore resta esplicito, altrimenti su alcune versioni la scheda si schiarisce
 * da sola e perde il contrasto col testo.
 */
export function Card({ style, ...rest }: ViewProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        // Sul tema chiaro l'ombra va tenuta più leggera: la stessa che dà
        // profondità sul buio, sul chiaro sporca.
        Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          },
          android: { elevation: isDark ? 3 : 2 },
          default: {
            boxShadow: isDark
              ? '0 4px 14px rgba(0,0,0,0.35)'
              : '0 2px 8px rgba(0,0,0,0.08)',
          },
        }),
        style,
      ]}
    />
  );
}
