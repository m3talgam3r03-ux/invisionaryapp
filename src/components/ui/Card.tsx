import { View, type ViewProps, StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

/** Superficie/"card" del design system: sfondo surface, bordo sottile, angoli arrotondati. */
export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
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
        style,
      ]}
    />
  );
}
