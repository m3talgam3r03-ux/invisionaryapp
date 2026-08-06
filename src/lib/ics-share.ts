import { Platform } from 'react-native';

import { nomeFileICS } from './ics';

/**
 * Consegna di un file .ics al calendario del dispositivo.
 *
 * Il contenuto lo genera `ics.ts`, che è puro e testato. Qui c'è solo la parte
 * che tocca il sistema, e che quindi i test non possono verificare.
 *
 * Su telefono si passa da `expo-sharing`, non da `Share` di React Native:
 * `Share.share({ url })` è supportato solo su iOS, e su Android `message`
 * manda testo semplice, che nessuna app di calendario interpreta. Con
 * `expo-sharing` il foglio di condivisione riceve un vero file e «Aggiungi a
 * Calendario» compare su entrambe le piattaforme.
 */
export type EsitoCondivisione =
  | { esito: 'condiviso' }
  | { esito: 'annullato' }
  | { esito: 'non_supportato' }
  | { esito: 'errore'; motivo: string };

/**
 * Vero se su questa piattaforma il pulsante ha senso.
 *
 * Su web è sempre vero (si scarica il file). Su telefono dipende dal sistema:
 * `expo-sharing` può non essere disponibile, e in quel caso è meglio nascondere
 * il pulsante che offrire qualcosa che non funziona.
 */
export async function condivisioneICSDisponibile(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const Sharing = await import('expo-sharing');
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function condividiICS(
  contenuto: string,
  titolo: string,
  quando: Date,
): Promise<EsitoCondivisione> {
  const nome = nomeFileICS(titolo, quando);
  return Platform.OS === 'web'
    ? scaricaSuWeb(contenuto, nome)
    : condividiSuTelefono(contenuto, nome);
}

/** Sul browser il file si scarica: nessun foglio di condivisione di mezzo. */
async function scaricaSuWeb(contenuto: string, nome: string): Promise<EsitoCondivisione> {
  try {
    const blob = new Blob([contenuto], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Rilasciare subito l'URL interromperebbe lo scaricamento su alcuni browser.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { esito: 'condiviso' };
  } catch (err) {
    return { esito: 'errore', motivo: messaggio(err) };
  }
}

/** Il file si scrive nella cache e si passa al foglio di condivisione. */
async function condividiSuTelefono(
  contenuto: string,
  nome: string,
): Promise<EsitoCondivisione> {
  try {
    // Import pigro: su web i moduli nativi non esistono e importarli in cima
    // romperebbe il bundle.
    const [{ File, Paths }, Sharing] = await Promise.all([
      import('expo-file-system'),
      import('expo-sharing'),
    ]);

    if (!(await Sharing.isAvailableAsync())) return { esito: 'non_supportato' };

    const file = new File(Paths.cache, nome);
    if (file.exists) file.delete();
    file.create();
    file.write(contenuto);

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/calendar',
      dialogTitle: nome,
      // Su iOS dice al foglio che tipo di contenuto è: senza, «Aggiungi a
      // Calendario» può non comparire fra le azioni proposte.
      UTI: 'com.apple.ical.ics',
    });
    return { esito: 'condiviso' };
  } catch (err) {
    return { esito: 'errore', motivo: messaggio(err) };
  }
}

function messaggio(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
