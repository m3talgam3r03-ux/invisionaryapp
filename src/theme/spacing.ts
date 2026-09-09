/**
 * Spaziatura e raggi.
 *
 * ── PERCHÉ I RAGGI SONO CRESCIUTI ──
 * Erano 8/12/16. Apple usa curve più ampie e, soprattutto, **proporzionate al
 * riquadro**: un raggio da 8 su una scheda larga tutto lo schermo la fa
 * sembrare un rettangolo con gli spigoli smussati per sbaglio. Su iOS una
 * scheda sta sui 16-20, un foglio sui 28-38.
 *
 * ── E PERCHÉ LO SPAZIO È PIÙ GENEROSO ──
 * Lo spazio è la cosa che più fa sembrare un'interfaccia costosa, e costa
 * zero. Quello che prima era il passo grande (24) adesso è il medio.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  xxl: 40,
  xxxl: 56,
} as const;

export const radius = {
  /** Chip, badge, elementi piccoli. */
  sm: 10,
  /** Campi e pulsanti. */
  md: 14,
  /** Schede. */
  lg: 20,
  /** Fogli e modali. */
  xl: 32,
  pill: 999,
} as const;

/**
 * Ombre per livello, già pronte per piattaforma.
 *
 * Una scheda non ha bisogno di un bordo se ha un'ombra giusta: l'ombra dice
 * «questo sta sopra» meglio di qualunque filetto, e non aggiunge una riga di
 * grigio a ogni rettangolo della schermata.
 *
 * Sul tema scuro l'ombra è più marcata perché su un fondo quasi nero
 * un'ombra leggera semplicemente non si vede.
 */
export const elevazione = {
  /** Schede, righe sollevate. */
  scheda: (scuro: boolean) => ({
    shadowColor: '#000',
    shadowOpacity: scuro ? 0.5 : 0.06,
    shadowRadius: scuro ? 18 : 10,
    shadowOffset: { width: 0, height: scuro ? 6 : 3 },
    elevation: scuro ? 6 : 3,
  }),
  /** Fogli, modali, barre che galleggiano. */
  foglio: (scuro: boolean) => ({
    shadowColor: '#000',
    shadowOpacity: scuro ? 0.6 : 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  }),
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
