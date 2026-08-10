import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { larghezzaContenuto, spacing, useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Se true il contenuto è scrollabile (default: false). */
  scroll?: boolean;
  /** Stile aggiuntivo per il contenitore del contenuto. */
  contentStyle?: ViewStyle;
  /**
   * Toglie il limite di larghezza. Serve alle poche schermate che di spazio
   * ne vogliono tutto — una mappa, una tabella larga — dove incolonnare il
   * contenuto lo rimpicciolirebbe e basta.
   */
  larga?: boolean;
};

/**
 * Contenitore base di schermata: sfondo del tema, safe-area e — su schermi
 * grandi — una colonna di contenuto centrata.
 *
 * La colonna non è un vezzo. Senza, sul web ogni blocco era largo quanto la
 * finestra: su un monitor da 1280 px una riga di testo lunga mezzo metro non
 * la segue nessuno, e i pulsanti finivano agli angoli opposti dello schermo.
 * Il limite sta in `theme/layout.ts` ed è di leggibilità: oltre i ~70
 * caratteri per riga l'occhio perde il capo della riga successiva.
 *
 * Sul telefono non cambia niente: sotto la soglia il limite non si applica.
 */
export function Screen({ children, scroll = false, contentStyle, larga = false }: ScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const massima = larga ? undefined : larghezzaContenuto(width);

  const inner: ViewStyle = {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.xl,
    // `alignSelf: center` incolonna senza toccare il resto: il contenitore
    // esterno resta a tutta larghezza e lo sfondo non si spezza.
    width: '100%',
    maxWidth: massima,
    alignSelf: 'center',
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[inner, contentStyle]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[inner, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
