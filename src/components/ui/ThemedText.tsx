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
    // Il rosso pieno del marchio, come TESTO su fondo scuro, sta a 3,01 di
    // contrasto: sotto la soglia di 4,5. Qui si usa la variante schiarita —
    // stesso rosso di carte, ma leggibile. Il pieno resta sui riempimenti.
    accent: colors.accentText,
    gold: colors.gold,
    success: colors.success,
    error: colors.error,
  };

  return <Text {...rest} style={[typography[variant], { color: toneColor[tone] }, style]} />;
}
