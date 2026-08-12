/**
 * Design tokens colore — brand Invisionary (dark-first).
 *
 * Regole d'uso:
 * - `accent` (rosso carte) SOLO per accenti, CTA e stati. MAI per il corpo del testo.
 * - `gold` SOLO per rank e vittorie (classifiche, badge, traguardi).
 * - Estetica premium/"mano vincente": nessun immaginario da azzardo.
 */

/**
 * Palette base condivisa (i valori grezzi del brand).
 *
 * ── PERCHÉ I SCURI SONO CALDI ──
 * Erano grigi neutri tendenti al blu (#0E0E10 → #2E2E33). Accanto all'oro del
 * marchio un grigio freddo lo spegne: i due colori si contrastano invece di
 * stare insieme, e l'oro sembra ottone. Questi scuri hanno una punta di rosso —
 * pochissimo, ma basta a far cantare l'oro e il rosso carte.
 *
 * ── E PERCHÉ I LIVELLI SONO PIÙ DISTANTI ──
 * Fra sfondo e superficie c'erano dodici punti di luminosità: le schede non si
 * staccavano dallo sfondo e tutto leggeva come un'unica massa grigia. Ora lo
 * scalino è più netto, così una scheda si vede che è una scheda.
 */
export const palette = {
  ink900: '#0B0A0A', // background — più profondo, così le schede si sollevano
  ink800: '#1A1817', // surface
  ink700: '#262321', // surface alternativa / elevazione
  ink600: '#38342F', // bordi — visibili senza gridare
  bone: '#F5F3EF', // testo (già caldo: ora la famiglia è coerente)
  smoke: '#918B84', // testo attenuato, riscaldato come il resto
  cardRed: '#C8102E', // accent (rosso carte) — per i RIEMPIMENTI
  /**
   * Il rosso quando fa da TESTO.
   *
   * `cardRed` su una superficie scura dà un contrasto di 3,01 — sotto la
   * soglia di 4,5 per il testo normale. Non si legge bene, e non è un
   * problema nuovo: c'era anche prima, solo che nessuno l'aveva misurato.
   * Questo schiarito sta a 4,82 e resta lo stesso rosso di carte.
   *
   * Il pieno resta `cardRed`, dove conta il bianco sopra (5,88: a posto).
   */
  cardRedText: '#EC4A62',
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
  /** Il rosso quando fa da testo: quello pieno non ha contrasto sufficiente. */
  accentText: string;
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
  accentText: palette.cardRedText,
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
  text: palette.ink900,
  textMuted: '#5F584F',
  accent: '#C8102E',
  // Su fondo chiaro il rosso pieno ha contrasto a sufficienza: resta lui.
  accentText: '#B00D28',
  gold: '#9A7B12', // oro più scuro per contrasto su sfondo chiaro
  success: '#2E8B57',
  error: '#D21F3C',
};
