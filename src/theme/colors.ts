/**
 * Colore — impostato come lo imposta Apple.
 *
 * ── LA DIFFERENZA DI FONDO ──
 * Prima ogni superficie aveva un bordo sottile per farsi vedere. Apple non
 * disegna quasi mai un bordo: usa **livelli**. Lo sfondo è il fondo, la scheda
 * sta un gradino sopra, il campo dentro la scheda un gradino ancora. Si capisce
 * cosa contiene cosa dalla luminosità, non da una riga grigia — e una schermata
 * con dieci schede non diventa una griglia di rettangoli.
 *
 * Da qui i tre livelli espliciti: `background` → `surface` → `surfaceAlt`,
 * distanziati abbastanza da vedersi ma non da separarsi.
 *
 * ── PERCHÉ QUASI NEUTRO ──
 * Il colore è un accento, non un materiale. Le superfici stanno su grigi
 * appena caldi; il rosso compare su ciò che si tocca e su ciò che è in
 * ritardo, l'oro solo su rank e vittorie. Su Apple Music l'interfaccia è
 * nera e grigia: il colore lo mettono le copertine, cioè il contenuto.
 *
 * ── COSA RESTA DEL MARCHIO ──
 * Il rosso carte e l'oro non si toccano: sono l'identità. Cambia quanto spesso
 * compaiono, non quali sono.
 */

export const palette = {
  // ── Scuri (il tema di casa) ────────────────────────────────────────────
  // Quasi neri, con una punta di caldo perché l'oro non sembri ottone.
  ink900: '#0A0A0C', // fondo
  ink800: '#161618', // scheda
  ink700: '#1F1F22', // dentro la scheda (campi, righe)
  ink600: '#2C2C30', // separatori, quando proprio servono
  ink500: '#48484E', // bordi visibili sui controlli

  bone: '#F7F7F8', // testo principale
  smoke: '#98989F', // testo secondario — 5,1 di contrasto su ink900
  ash: '#6C6C74', // testo terziario, disattivato

  // ── Chiari ─────────────────────────────────────────────────────────────
  paper: '#FFFFFF',
  paper2: '#F2F2F7', // il grigio delle liste raggruppate iOS
  paper3: '#E5E5EA',

  // ── Marchio ────────────────────────────────────────────────────────────
  cardRed: '#E5334E', // riempimenti e accenti: più luminoso del vecchio #C8102E
  /**
   * Il rosso quando fa da TESTO su fondo scuro.
   * `cardRed` come testo sta sotto la soglia di leggibilità; questo sta sopra
   * ed è lo stesso rosso percepito.
   */
  cardRedText: '#FF6B7F',
  cardRedDark: '#C4102A', // il rosso su fondo chiaro, dove serve più corpo

  gold: '#E0B23C', // rank e vittorie, mai altro
  goldDark: '#8A6D14',

  green: '#30D158', // il verde di iOS
  greenDark: '#248A3D',
  red: '#FF453A', // l'errore di iOS
  redDark: '#C9291F',
} as const;

export type ThemeColors = {
  /** Il fondo della schermata. */
  background: string;
  /** Un gradino sopra il fondo: le schede. */
  surface: string;
  /** Un gradino sopra la scheda: campi e righe dentro una scheda. */
  surfaceAlt: string;
  /** Separatori. Da usare con parsimonia: il livello viene prima del bordo. */
  border: string;
  /** Bordo visibile, per i controlli che devono dichiararsi toccabili. */
  borderStrong: string;
  text: string;
  textMuted: string;
  /** Terzo livello di testo: disattivato, segnaposto. */
  textFaint: string;
  accent: string;
  /** Il rosso quando fa da testo: quello pieno non ha contrasto sufficiente. */
  accentText: string;
  gold: string;
  success: string;
  error: string;
  /** Ombra: cambia colore fra chiaro e scuro, non solo opacità. */
  shadow: string;
};

export const darkColors: ThemeColors = {
  background: palette.ink900,
  surface: palette.ink800,
  surfaceAlt: palette.ink700,
  border: palette.ink600,
  borderStrong: palette.ink500,
  text: palette.bone,
  textMuted: palette.smoke,
  textFaint: palette.ash,
  accent: palette.cardRed,
  accentText: palette.cardRedText,
  gold: palette.gold,
  success: palette.green,
  error: palette.red,
  shadow: '#000000',
};

export const lightColors: ThemeColors = {
  // Sul chiaro il fondo è il grigio e la scheda è bianca: è il verso opposto
  // dello scuro, ed è come iOS costruisce le liste raggruppate.
  background: palette.paper2,
  surface: palette.paper,
  surfaceAlt: palette.paper2,
  border: palette.paper3,
  borderStrong: '#C7C7CC',
  text: '#111114',
  textMuted: '#6C6C74',
  textFaint: '#A0A0A8',
  accent: palette.cardRedDark,
  accentText: palette.cardRedDark,
  gold: palette.goldDark,
  success: palette.greenDark,
  error: palette.redDark,
  shadow: '#1A1A2E',
};
