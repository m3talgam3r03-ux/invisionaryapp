import { View } from 'react-native';

import { ThemedText } from '@/components/ui';
import { radius, useTheme } from '@/theme';

/** Crest del rank a carte (oro = rank/traguardi). */
export function RankBadge({ rank, size = 64 }: { rank: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: colors.gold,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ThemedText
        style={{
          color: colors.gold,
          fontWeight: '800',
          fontSize: Math.round(size * 0.42),
          lineHeight: Math.round(size * 0.5),
        }}
      >
        {rank}
      </ThemedText>
    </View>
  );
}
