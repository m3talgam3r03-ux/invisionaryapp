/**
 * Preparazione del testo per la sintesi vocale italiana.
 *
 * Le risposte dell'agente sono scritte per l'occhio: elenchi puntati, trattini
 * lunghi, citazioni della fonte, simboli. Dati in pasto a un motore TTS così
 * come sono, il risultato è illeggibile — il lettore scandisce i trattini,
 * dice "percento" attaccato al numero e non fa pause tra i punti elenco.
 *
 * Questa funzione è volutamente pura: è la parte testabile della voce.
 */

/** Limite prudenziale per singola utterance (Android tronca oltre ~4000). */
export const MAX_SPEECH_LENGTH = 3800;

export function toSpeech(text: string): string {
  let out = text;

  // 1. Le citazioni della fonte sono già visibili sotto la bolla: all'orecchio
  //    sono solo rumore in mezzo alla frase.
  out = out.replace(/\((?:fonte|fonti)\s*:[^)]*\)/gi, '');
  out = out.replace(/\[\d+\]/g, '');

  // 2. Markdown → testo nudo.
  out = out
    .replace(/```[\s\S]*?```/g, ' ') // blocchi di codice: non si leggono
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<![*\w])\*([^*\n]+)\*(?!\w)/g, '$1')
    .replace(/(?<![_\w])_([^_\n]+)_(?!\w)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '');

  // 3. Punti elenco: si toglie il segno e si chiude la riga con un punto, così
  //    il motore fa una pausa vera invece di incollare le voci una all'altra.
  out = out.replace(/^\s*(?:[-*·•‣]|\d+[.)])\s+/gm, '');
  out = out
    .split(/\r?\n/)
    .map((line) => {
      const l = line.trim();
      if (!l) return '';
      return /[.!?:;]$/.test(l) ? l : `${l}.`;
    })
    .join('\n');

  // 4. Simboli che vanno pronunciati, non scanditi.
  out = out
    .replace(/→/g, ' diventa ')
    .replace(/(\s)[—–](\s)/g, ',$2') // inciso → pausa breve
    .replace(/[—–]/g, ' ')
    .replace(/(^|[\s(])[-−]\s?(\d)/g, '$1meno $2') // "-30%" → "meno 30%"
    .replace(/(\d)\s*%/g, '$1 per cento')
    .replace(/%/g, ' per cento')
    .replace(/(\d)\s*€/g, '$1 euro')
    .replace(/€\s*(\d)/g, '$1 euro')
    .replace(/(\d)\s*\/\s*(\d)/g, '$1 diviso $2')
    .replace(/\s*·\s*/g, ', ');

  // 5. Compattazione finale. Le righe vuote diventano una pausa di paragrafo.
  out = out
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();

  return out.length > MAX_SPEECH_LENGTH ? `${out.slice(0, MAX_SPEECH_LENGTH).trimEnd()}…` : out;
}
