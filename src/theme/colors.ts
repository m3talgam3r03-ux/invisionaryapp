/**
 * Design tokens colore — brand Invisionary (dark-first).
 *
 * Regole d'uso:
 * - `accent` (rosso carte) SOLO per accenti, CTA e stati. MAI per il corpo del testo.
 * - `gold` SOLO per rank e vittorie (classifiche, badge, traguardi).
 * - Estetica premium/"mano vincente": nessun immaginario da azzardo.
 */

// Palette base condivisa (i valori grezzi del brand).
export const palette = {
  ink900: '#0E0E10', // background
  ink800: '#1A1A1D', // surface
  ink700: '#232327', // surface alternativa / elevazione
  ink600: '#2E2E33', // bordi
  bone: '#F5F3EF', // testo
  smoke: '#8A8A90', // testo attenuato
  cardRed: '#C8102E', // accent (rosso carte)
  gold: '#C9A227', // rank / vittorie
  green: '#2E8B57', // success
  red: '#D21F3C', // error
} as const;

/** Forma di un tema colore (i valori sono stringhe: entrambe le palette la rispettano). */
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  gold: string;
  success: string;
  error: string;
};

// Tema scuro (default dell'app).
export const darkColors: ThemeColors = {
  background: palette.ink900,
  surface: palette.ink800,
  surfaceAlt: palette.ink700,
  border: palette.ink600,
  text: palette.bone,
  textMuted: palette.smoke,
  accent: palette.cardRed,
  gold: palette.gold,
  success: palette.green,
  error: palette.red,
};

// Tema chiaro (predisposto per il futuro; l'app di default resta scura).
export const lightColors: ThemeColors = {
  background: '#F5F3EF',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEAE4',
  border: '#DAD7CF',
  text: '#0E0E10',
  textMuted: '#5A5A60',
  accent: '#C8102E',
  gold: '#9A7B12', // oro più scuro per contrasto su sfondo chiaro
  success: '#2E8B57',
  error: '#D21F3C',
};
