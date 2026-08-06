/**
 * Generazione di file iCalendar (.ics) — RFC 5545.
 *
 * Modulo puro: nessun import, nessuna rete, nessun accesso al filesystem. Chi
 * scrive il file o apre il foglio di condivisione sta altrove.
 *
 * PERCHÉ NON BASTA CONCATENARE STRINGHE
 * Il formato ha tre regole che sembrano dettagli e non lo sono: se una salta,
 * Google Calendar e Apple Calendar rifiutano il file senza dire perché.
 *
 * 1. Le righe finiscono con CRLF, non con «a capo». Sempre.
 * 2. Nessuna riga può superare i 75 OTTETTI — non caratteri. In italiano la
 *    differenza è concreta: «è» pesa due byte. Le righe più lunghe si spezzano
 *    e le continuazioni iniziano con uno spazio.
 * 3. Nei campi di testo, `\` `;` `,` e gli a capo vanno protetti. Un titolo
 *    come «Call con Marco, martedì» senza protezione diventa due campi.
 */

export type EventoICS = {
  /** Identificatore stabile: lo stesso evento riaggiunto non si duplica. */
  uid: string;
  inizio: Date;
  fine: Date;
  titolo: string;
  descrizione?: string;
  luogo?: string;
  /** Un evento annullato si manda comunque: è così che sparisce dal calendario. */
  annullato?: boolean;
  /** Istante di generazione. Esplicito per rendere il risultato verificabile. */
  creatoIl: Date;
};

const CRLF = '\r\n';
const PRODID = '-//Invisionary//Appuntamenti//IT';

/** `AAAAMMGGTHHMMSSZ` in UTC, la forma che tutti i calendari accettano. */
export function formattaData(d: Date): string {
  const due = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${due(d.getUTCMonth() + 1)}${due(d.getUTCDate())}` +
    `T${due(d.getUTCHours())}${due(d.getUTCMinutes())}${due(d.getUTCSeconds())}Z`
  );
}

/**
 * Protegge i caratteri che nel formato hanno un significato.
 * L'ordine conta: la barra rovesciata va per prima, altrimenti si protegge
 * anche quella appena aggiunta dalle altre sostituzioni.
 */
export function proteggiTesto(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Quanti byte occupa un carattere in UTF-8. */
function ottetti(codice: number): number {
  if (codice < 0x80) return 1;
  if (codice < 0x800) return 2;
  if (codice < 0x10000) return 3;
  return 4;
}

/**
 * Spezza una riga più lunga di 75 ottetti, continuandola con uno spazio.
 *
 * Si contano gli OTTETTI e si spezza fra un carattere e l'altro: tagliare a
 * metà di una lettera accentata produrrebbe byte non validi. Le coppie
 * surrogate (le emoji) restano intere perché si itera per punti di codice.
 */
export function piegaRiga(riga: string, limite = 75): string {
  const punti = [...riga];
  const righe: string[] = [];
  let corrente = '';
  let peso = 0;

  for (const ch of punti) {
    const p = ottetti(ch.codePointAt(0)!);
    // Dalla seconda riga in poi lo spazio iniziale occupa un ottetto.
    const massimo = righe.length === 0 ? limite : limite - 1;
    if (peso + p > massimo) {
      righe.push(corrente);
      corrente = ch;
      peso = p;
    } else {
      corrente += ch;
      peso += p;
    }
  }
  righe.push(corrente);

  return righe.map((r, i) => (i === 0 ? r : ` ${r}`)).join(CRLF);
}

/** Una proprietà completa: nome, valore protetto e riga piegata. */
function proprieta(nome: string, valore: string): string {
  return piegaRiga(`${nome}:${proteggiTesto(valore)}`);
}

/** Un file .ics con un solo evento. */
export function creaICS(evento: EventoICS): string {
  return creaICSMultiplo([evento]);
}

/**
 * Un file .ics con più eventi.
 *
 * Gli eventi con date non valide vengono scartati: un `DTSTART` malformato fa
 * rifiutare l'INTERO file, quindi una riga sbagliata porterebbe via anche
 * quelle giuste.
 */
export function creaICSMultiplo(eventi: EventoICS[]): string {
  const validi = eventi.filter(
    (e) => !Number.isNaN(e.inizio.getTime()) && !Number.isNaN(e.fine.getTime()),
  );

  const righe: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    // REQUEST farebbe partire gli inviti via email; qui si aggiunge e basta.
    'METHOD:PUBLISH',
  ];

  for (const e of validi) {
    righe.push(
      'BEGIN:VEVENT',
      proprieta('UID', e.uid),
      `DTSTAMP:${formattaData(e.creatoIl)}`,
      `DTSTART:${formattaData(e.inizio)}`,
      `DTEND:${formattaData(e.fine)}`,
      proprieta('SUMMARY', e.titolo),
    );
    if (e.descrizione) righe.push(proprieta('DESCRIPTION', e.descrizione));
    if (e.luogo) righe.push(proprieta('LOCATION', e.luogo));
    righe.push(`STATUS:${e.annullato ? 'CANCELLED' : 'CONFIRMED'}`);
    righe.push('END:VEVENT');
  }

  righe.push('END:VCALENDAR');
  // Il file termina con CRLF: alcuni lettori scartano l'ultima riga senza.
  return righe.join(CRLF) + CRLF;
}

/**
 * I segni diacritici che `normalize('NFD')` stacca dalle lettere accentate.
 * Costruita da stringa: nel sorgente l'intervallo sarebbe due caratteri
 * invisibili, impossibili da rileggere e facili da cancellare per sbaglio.
 */
const SEGNI_DIACRITICI = new RegExp('[\\u0300-\\u036f]', 'g');

/** Nome file sicuro per un appuntamento. */
export function nomeFileICS(titolo: string, quando: Date): string {
  const base = titolo
    .normalize('NFD')
    // Segni diacritici staccati da NFD: «ì» → «i». L'intervallo si scrive per
    // codice, altrimenti nel sorgente sarebbero caratteri invisibili.
    .replace(SEGNI_DIACRITICI, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40);
  const giorno = Number.isNaN(quando.getTime())
    ? 'appuntamento'
    : formattaData(quando).slice(0, 8);
  return `${base || 'appuntamento'}-${giorno}.ics`;
}
