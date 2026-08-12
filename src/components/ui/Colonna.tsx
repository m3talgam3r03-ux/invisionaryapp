import type { ReactNode } from 'react';
import { useWindowDimensions, View, type ViewStyle } from 'react-native';

import { larghezzaContenuto } from '@/theme';

/**
 * La colonna di contenuto: limitata e centrata su schermi grandi, piena sul
 * telefono.
 *
 * Esiste perché cinque schermate NON possono usare `Screen`: contengono un
 * elenco che deve riempire l'altezza, e il contenitore imbottito di `Screen`
 * glielo impedirebbe. Prima restavano a tutta larghezza mentre tutte le altre
 * si incolonnavano — su un monitor la differenza si vedeva, e sembrava un
 * difetto perché lo era.
 *
 * Il limite sta in `theme/layout.ts` ed è lo stesso: una misura sola per tutta
 * l'app, non due che prima o poi divergono.
 */
export function Colonna({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { width } = useWindowDimensions();

  return (
    <View
      style={[
        { flex: 1, width: '100%', maxWidth: larghezzaContenuto(width), alignSelf: 'center' },
        style,
      ]}
    >
      {children}
    </View>
  );
}
