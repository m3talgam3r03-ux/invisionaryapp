import { View, type DimensionValue } from 'react-native';

import { spacing, useTheme } from '@/theme';

type Props = {
  /** 0-100. Valori fuori scala vengono riportati dentro. */
  percent: number;
  height?: number;
};

/**
 * Barra di avanzamento. L'oro è riservato ai traguardi: qui indica un percorso
 * completato, mentre finché è in corso resta nel colore testo.
 */
export function ProgressBar({ percent, height = 6 }: Props) {
  const { colors } = useTheme();
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const completo = p >= 100;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: p }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.surfaceAlt,
        overflow: 'hidden',
        marginVertical: spacing.xs,
      }}
    >
      <View
        style={{
          width: `${p}%` as DimensionValue,
          height,
          borderRadius: height / 2,
          backgroundColor: completo ? colors.gold : colors.text,
        }}
      />
    </View>
  );
}
