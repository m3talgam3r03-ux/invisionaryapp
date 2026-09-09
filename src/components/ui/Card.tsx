import { Platform, View, type ViewProps } from 'react-native';

import { elevazione, radius, spacing, useTheme } from '@/theme';

type CardProps = ViewProps & {
  /**
   * Scheda «incassata»: sta DENTRO un'altra superficie invece che sopra il
   * fondo. Niente ombra, un gradino di luminosità in più. È il modo in cui
   * iOS disegna un campo dentro una scheda.
   */
  incassata?: boolean;
};

/**
 * La superficie del sistema.
 *
 * ── PERCHÉ NON HA PIÙ UN BORDO ──
 * Prima ogni scheda era circondata da un filetto grigio. Con otto schede su
 * una schermata il risultato è una griglia di rettangoli, e l'occhio conta i
 * bordi invece di leggere il contenuto.
 *
 * Apple non li disegna: usa il livello. La scheda è un gradino più chiara del
 * fondo e ha un'ombra morbida, e tanto basta a dire dove comincia e dove
 * finisce. Meno righe, e la stessa informazione.
 */
export function Card({ style, incassata = false, ...rest }: CardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: incassata ? colors.surfaceAlt : colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        // L'ombra solo a chi sta SOPRA qualcosa. Una scheda incassata che
        // proietta un'ombra verso l'esterno è un oggetto impossibile, e si
        // vede che è sbagliato anche senza saper dire perché.
        // Sul web l'ombra si scrive con `boxShadow`; su iOS e Android con le
        // proprietà `shadow*`. Sono forme diverse, quindi il ramo è esplicito.
        !incassata &&
          (Platform.OS === 'web'
            ? {
                boxShadow: isDark
                  ? '0 6px 18px rgba(0,0,0,0.5)'
                  : '0 3px 10px rgba(0,0,0,0.06)',
              }
            : elevazione.scheda(isDark)),
        style,
      ]}
    />
  );
}
