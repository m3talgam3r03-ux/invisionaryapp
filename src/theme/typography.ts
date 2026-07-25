import { Platform, type TextStyle } from 'react-native';

/**
 * Tipografia — brand Invisionary.
 * - display: sans condensata maiuscola con tracking ampio per i titoli.
 * - body: sans neutra leggibile per il corpo del testo.
 *
 * Per la Fase 0 usiamo i font di sistema (su Android esiste `sans-serif-condensed`,
 * su iOS simuliamo il "condensed" con maiuscolo + tracking). Font custom (es. un
 * condensed tipo Archivo/Oswald) si potranno aggiungere con `expo-font` più avanti.
 */
export const fontFamilies = {
  display: Platform.select({
    ios: 'System',
    android: 'sans-serif-condensed',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

export const typography = {
  display: {
    fontFamily: fontFamilies.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  heading: {
    fontFamily: fontFamilies.body,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  label: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
