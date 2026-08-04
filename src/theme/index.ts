import { useColorScheme } from '@/hooks/use-color-scheme';

import { darkColors, lightColors, type ThemeColors } from './colors';

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './brand';
export * from './navigation';

export type Theme = {
  isDark: boolean;
  colors: ThemeColors;
};

/**
 * Hook di tema — DARK-FIRST.
 * Se lo schema di sistema non è specificato (o è "dark") usiamo il tema scuro;
 * solo quando il sistema chiede esplicitamente "light" passiamo al tema chiaro.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  return { isDark, colors: isDark ? darkColors : lightColors };
}
