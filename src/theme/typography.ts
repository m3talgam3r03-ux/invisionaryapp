import { Platform, type TextStyle } from 'react-native';

/**
 * Tipografia — impostata come la imposta Apple.
 *
 * ── COSA È CAMBIATO, E PERCHÉ ──
 * Prima ogni titolo era MAIUSCOLO con `letterSpacing: 2`. È una scelta da
 * poster: funziona su tre parole e crolla su una schermata piena, perché il
 * maiuscolo toglie il profilo alle parole — le ascendenti e le discendenti,
 * quelle che l'occhio usa per riconoscere una forma senza leggerla lettera per
 * lettera. Con dieci titoli così su una pagina si legge tutto due volte.
 *
 * Apple fa l'opposto e lo fa ovunque, da Impostazioni a Music: **frase
 * normale, peso alto, tracking NEGATIVO sui corpi grandi**. Un titolo da 28
 * punti con le lettere leggermente ravvicinate legge come un oggetto solo; lo
 * stesso titolo con tracking positivo legge come una fila di lettere.
 *
 * La gerarchia la fa la DIMENSIONE, non il maiuscolo. Da 13 a 34 ci sono
 * cinque gradini netti: chi guarda capisce l'ordine senza doverlo decifrare.
 *
 * ── I NOMI RESTANO QUELLI ──
 * `display`, `title`, `heading`, `body`, `label`, `caption`, `mono` sono usati
 * in una trentina di schermate. Cambiano i valori, non le chiavi: l'app cambia
 * faccia senza che nessun componente venga toccato.
 */

export const fontFamilies = {
  /**
   * Manrope, da Google Fonts — licenza aperta, incorporata nell'app.
   *
   * Perché non il carattere di sistema: San Francisco e Roboto sono
   * eccellenti, e sono di TUTTI. Un'app che vuole un'identità propria non
   * può avere le stesse lettere di ogni altra app del telefono.
   *
   * Perché Manrope: è geometrico ma con un'altezza della x generosa, quindi
   * regge sia il titolo da 34 punti sia la didascalia da 13. Sette pesi
   * permettono di costruire la gerarchia col PESO invece che col maiuscolo,
   * che è esattamente quello che abbiamo appena smesso di fare.
   *
   * ⚠️ Questi nomi devono corrispondere alle chiavi passate a useFonts() in
   * src/app/_layout.tsx. React Native cerca il carattere per nome e, se non
   * lo trova, ripiega in silenzio sul sistema senza dire niente.
   */
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;

export const typography = {
  /** Il numero o il nome che domina una schermata. Uno per pagina, non due. */
  display: {
    fontFamily: fontFamilies.extrabold,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.8,
  },
  /** Titolo di schermata. */
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  /** Titolo di una scheda o di un blocco. */
  heading: {
    fontFamily: fontFamilies.semibold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  /**
   * Il corpo del testo. 17 punti non è un capriccio: è la misura che iOS usa
   * di default, ed è tarata sulla distanza a cui si tiene un telefono.
   */
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  /**
   * Etichette e intestazioni di sezione.
   *
   * Non più maiuscolo: nelle liste raggruppate di iOS l'intestazione è in
   * frase normale, semibold, in grigio. Il grigio e il peso bastano a dire
   * «questa è un'etichetta, non contenuto» — senza gridare.
   */
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  /** Note, didascalie, testo di servizio. */
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  /**
   * Numeri incolonnati: saldi, punti, quantità.
   * `tabular-nums` tiene le cifre della stessa larghezza, così una colonna di
   * importi non balla a ogni aggiornamento.
   */
  numero: {
    fontFamily: fontFamilies.extrabold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
