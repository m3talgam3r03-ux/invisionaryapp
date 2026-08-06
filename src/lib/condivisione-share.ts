import { Platform } from 'react-native';
import type { View } from 'react-native';
import type { RefObject } from 'react';

import { nomeFileCard, type TipoCard } from './condivisione';

/**
 * Cattura la card e la passa al foglio di condivisione.
 *
 * Qui c'è solo la parte che tocca il sistema: cosa può finire sulla card lo
 * decide `condivisione.ts`, che è puro e testato. Questa funzione non conosce
 * il contenuto e non deve conoscerlo — se un giorno servisse un controllo in
 * più, va aggiunto là, non qui.
 */
export type EsitoCard =
  | { esito: 'condiviso' }
  | { esito: 'non_supportato' }
  | { esito: 'errore'; motivo: string };

/** Vero se su questa piattaforma si può generare e condividere l'immagine. */
export async function condivisioneCardDisponibile(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const Sharing = await import('expo-sharing');
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function condividiCard(
  riferimento: RefObject<View | null>,
  tipo: TipoCard,
): Promise<EsitoCard> {
  if (!riferimento.current) {
    return { esito: 'errore', motivo: 'La card non è ancora pronta.' };
  }

  try {
    const { captureRef } = await import('react-native-view-shot');

    // `result: 'tmpfile'` scrive un file invece di restituire base64: una PNG
    // 1080×1920 in base64 sono megabyte di stringa in memoria, e su Android è
    // il modo più rapido per far cadere l'app.
    const uri = await captureRef(riferimento, {
      format: 'png',
      quality: 1,
      width: 1080,
      height: 1920,
      result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
    });

    if (Platform.OS === 'web') return scaricaSuWeb(uri, nomeFileCard(tipo, new Date()));

    const Sharing = await import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return { esito: 'non_supportato' };

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Condividi il traguardo',
      UTI: 'public.png',
    });
    return { esito: 'condiviso' };
  } catch (err) {
    return { esito: 'errore', motivo: err instanceof Error ? err.message : String(err) };
  }
}

function scaricaSuWeb(dataUri: string, nome: string): EsitoCard {
  try {
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { esito: 'condiviso' };
  } catch (err) {
    return { esito: 'errore', motivo: err instanceof Error ? err.message : String(err) };
  }
}
