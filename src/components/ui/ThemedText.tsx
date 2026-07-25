import { Text, type TextProps } from 'react-native';

import { typography, useTheme, type TypographyVariant } from '@/theme';

type Tone = 'default' | 'muted' | 'accent' | 'gold' | 'success' | 'error';

export type ThemedTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
};

/**
 * Testo tematizzato: applica una variante tipografica del design system e un "tone"
 * di colore. Ricorda: `accent` (rosso) e `gold` vanno usati con parsimonia
 * (accenti/CTA/stati e rank/vittorie), mai per lunghi corpi di testo.
 */
export function ThemedText({ variant = 'body', tone = 'default', style, ...rest }: ThemedTextProps) {
  const { colors } = useTheme();

  const toneColor: Record<Tone, string> = {
    default: colors.text,
    muted: colors.textMuted,
    accent: colors.accent,
    gold: colors.gold,
    success: colors.success,
    error: colors.error,
  };

  return <Text {...rest} style={[typography[variant], { color: toneColor[tone] }, style]} />;
}
