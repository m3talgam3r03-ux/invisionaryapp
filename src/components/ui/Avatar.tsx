import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

import { ThemedText } from './ThemedText';

/** Iniziali da un nome completo: "Mario Rossi" → "MR", "Mario" → "MA". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Pastiglia con le iniziali. Dà alle liste un punto d'ancoraggio visivo: senza,
 * venti righe di solo testo sono indistinguibili e si scorre senza vedere.
 */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.border,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ThemedText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
        {initials(name)}
      </ThemedText>
    </View>
  );
}
