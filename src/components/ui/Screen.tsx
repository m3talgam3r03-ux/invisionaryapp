import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Se true il contenuto è scrollabile (default: false). */
  scroll?: boolean;
  /** Stile aggiuntivo per il contenitore del contenuto. */
  contentStyle?: ViewStyle;
};

/**
 * Contenitore base di schermata: applica lo sfondo del tema e le safe-area.
 * Dark-first di default.
 */
export function Screen({ children, scroll = false, contentStyle }: ScreenProps) {
  const { colors } = useTheme();

  const inner: ViewStyle = {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.xl,
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={[inner, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[inner, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
