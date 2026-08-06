import { Platform, Share } from 'react-native';

import { nomeFileICS } from './ics';

/**
 * Consegna di un file .ics al calendario del dispositivo.
 *
 * Il contenuto lo genera `ics.ts`, che è puro e testato. Qui c'è solo la parte
 * che tocca il sistema, e che quindi i test non possono verificare.
 *
 * ⚠️ SU ANDROID NON FUNZIONA, E LO DICE.
 * Il foglio di condivisione di Android non accetta un file da `Share` di React
 * Native: `Share.share({ url })` è supportato solo su iOS, e su Android
 * `message` manda testo semplice, che nessuna app di calendario interpreta.
 * Servirebbe `expo-sharing` (~30 kB), che non è fra le dipendenze e non l'ho
 * aggiunta: le dipendenze si concordano prima.
 *
 * Finché non c'è, la funzione restituisce `non_supportato` e l'interfaccia
 * nasconde il pulsante invece di offrire qualcosa che non funziona.
 */
export type EsitoCondivisione =
  | { esito: 'condiviso' }
  | { esito: 'annullato' }
  | { esito: 'non_supportato' }
  | { esito: 'errore'; motivo: string };

/** Vero se su questa piattaforma il pulsante ha senso. */
export function condivisioneICSDisponibile(): boolean {
  return Platform.OS === 'web' || Platform.OS === 'ios';
}

export async function condividiICS(
  contenuto: string,
  titolo: string,
  quando: Date,
): Promise<EsitoCondivisione> {
  const nome = nomeFileICS(titolo, quando);

  if (Platform.OS === 'web') return scaricaSuWeb(contenuto, nome);
  if (Platform.OS === 'ios') return condividiSuIOS(contenuto, nome);
  return { esito: 'non_supportato' };
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

/**
 * Su iOS il file si scrive nella cache e si passa al foglio di condivisione,
 * da cui «Aggiungi a Calendario» lo apre.
 */
async function condividiSuIOS(contenuto: string, nome: string): Promise<EsitoCondivisione> {
  try {
    // Import pigro: su web il modulo nativo non esiste e importarlo in cima
    // romperebbe il bundle.
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.cache, nome);
    if (file.exists) file.delete();
    file.create();
    file.write(contenuto);

    const esito = await Share.share({ url: file.uri, title: nome });
    return esito.action === Share.dismissedAction ? { esito: 'annullato' } : { esito: 'condiviso' };
  } catch (err) {
    return { esito: 'errore', motivo: messaggio(err) };
  }
}

function messaggio(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
