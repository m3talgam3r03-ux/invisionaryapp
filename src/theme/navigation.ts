import { Platform } from 'react-native';

import { darkColors } from './colors';

/**
 * Opzioni di navigazione condivise, sul modello delle app social iOS.
 *
 * Le scelte, e il perché:
 *
 * · L'intestazione ha lo STESSO colore del contenuto, non una superficie più
 *   chiara. Uno scalino di colore in cima spezza la schermata; senza, il
 *   contenuto sembra continuare sotto la barra.
 *
 * · Nessuna ombra sotto l'intestazione: è quello che fa sembrare l'interfaccia
 *   piatta e moderna invece che a livelli sovrapposti.
 *
 * · Il pulsante indietro è solo il segno «‹», senza l'etichetta della schermata
 *   precedente. iOS di serie scrive «‹ Contatti», che a ogni livello mangia
 *   spazio e sposta il titolo.
 *
 * · Il gesto di trascinamento dal bordo sinistro resta attivo: su iPhone è il
 *   modo naturale di tornare indietro, più del pulsante.
 *
 * Nota sulle schede: i sotto-percorsi vivono DENTRO la scheda, quindi la barra
 * in basso resta visibile mentre si naviga e ritoccando la scheda già attiva si
 * torna alla sua radice. È il comportamento che ci si aspetta.
 *
 * Nessun tipo importato da react-navigation: non è fra le dipendenze del
 * progetto (Expo Router 57 ha la propria implementazione). La validazione
 * avviene comunque, dove le opzioni vengono passate a `<Stack>`.
 */
export const stackScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: darkColors.background },
  headerShadowVisible: false,
  headerTintColor: darkColors.text,
  headerTitleStyle: {
    color: darkColors.text,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  headerBackTitle: '',
  contentStyle: { backgroundColor: darkColors.background },
  animation: (Platform.OS === 'ios' ? 'default' : 'slide_from_right') as
    | 'default'
    | 'slide_from_right',
  gestureEnabled: true,
};

/**
 * Schermate di creazione: salgono dal basso come un foglio, invece di scivolare
 * di lato. Serve a distinguere «sto aggiungendo qualcosa» da «sto navigando»:
 * un foglio si chiude tirandolo giù, e questo dice da solo che è annullabile.
 */
export const modalScreenOptions = {
  presentation: 'modal' as const,
  animation: 'slide_from_bottom' as const,
};
