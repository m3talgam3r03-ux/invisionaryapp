/**
 * Test della generazione .ics (src/lib/ics.ts).
 *
 * Le tre regole del formato che sembrano dettagli e non lo sono — CRLF,
 * 75 ottetti, protezione dei caratteri — hanno un test ciascuna. Se una salta,
 * Google Calendar e Apple Calendar rifiutano il file senza dire perché, e
 * senza questi test non ce ne accorgeremmo fino a quando non lo fa un utente.
 */
import { describe, expect, it } from 'vitest';

import {
  creaICS,
  creaICSMultiplo,
  formattaData,
  nomeFileICS,
  piegaRiga,
  proteggiTesto,
  type EventoICS,
} from '@/lib/ics';

const CREATO = new Date(Date.UTC(2026, 7, 6, 12, 0, 0));

function evento(extra: Partial<EventoICS> = {}): EventoICS {
  return {
    uid: 'prenotazione-1@invisionary',
    inizio: new Date(Date.UTC(2026, 7, 10, 7, 0, 0)),
    fine: new Date(Date.UTC(2026, 7, 10, 7, 30, 0)),
    titolo: 'Call con Marco',
    creatoIl: CREATO,
    ...extra,
  };
}

/** Le righe come le legge un calendario: separate da CRLF e ricongiunte. */
function righeLogiche(ics: string): string[] {
  return ics
    .split('\r\n')
    .reduce<string[]>((acc, riga) => {
      if (riga.startsWith(' ') && acc.length > 0) {
        acc[acc.length - 1] += riga.slice(1); // continuazione
      } else if (riga !== '') {
        acc.push(riga);
      }
      return acc;
    }, []);
}

describe('date', () => {
  it('sempre in UTC, col suffisso Z', () => {
    expect(formattaData(new Date(Date.UTC(2026, 0, 5, 9, 8, 7)))).toBe('20260105T090807Z');
    expect(formattaData(new Date(Date.UTC(2026, 11, 31, 23, 59, 59)))).toBe('20261231T235959Z');
  });
});

describe('protezione dei caratteri', () => {
  it('protegge virgole, punti e virgola, barre e a capo', () => {
    // «Call con Marco, martedì» senza protezione diventerebbe due campi.
    expect(proteggiTesto('Call con Marco, martedì')).toBe('Call con Marco\\, martedì');
    expect(proteggiTesto('a;b')).toBe('a\\;b');
    expect(proteggiTesto('a\nb')).toBe('a\\nb');
    expect(proteggiTesto('a\r\nb')).toBe('a\\nb');
  });

  it('la barra rovesciata va protetta per prima', () => {
    // Se si protegge dopo, si finisce per proteggere anche le barre appena
    // aggiunte dalle altre sostituzioni.
    expect(proteggiTesto('a\\b')).toBe('a\\\\b');
    expect(proteggiTesto('a\\,b')).toBe('a\\\\\\,b');
  });
});

describe('piegatura a 75 ottetti', () => {
  it('lascia stare le righe corte', () => {
    expect(piegaRiga('SUMMARY:Call con Marco')).toBe('SUMMARY:Call con Marco');
  });

  it('spezza le righe lunghe e continua con uno spazio', () => {
    const riga = 'DESCRIPTION:' + 'a'.repeat(200);
    const pieghe = piegaRiga(riga).split('\r\n');
    expect(pieghe.length).toBeGreaterThan(1);
    expect(pieghe[0]).toHaveLength(75);
    for (const p of pieghe.slice(1)) {
      expect(p.startsWith(' '), 'le continuazioni iniziano con uno spazio').toBe(true);
      expect(p.length).toBeLessThanOrEqual(75);
    }
    // Ricongiungendo si torna all'originale.
    expect(pieghe.map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(riga);
  });

  it('conta gli OTTETTI, non i caratteri', () => {
    // 40 «è» sono 80 byte: come caratteri starebbero in una riga sola.
    const riga = 'X:' + 'è'.repeat(40);
    const pieghe = piegaRiga(riga).split('\r\n');
    expect(pieghe.length).toBeGreaterThan(1);
    for (const p of pieghe) {
      expect(byte(p)).toBeLessThanOrEqual(75);
    }
  });

  it('non taglia a metà un carattere multibyte', () => {
    const riga = 'X:' + 'è'.repeat(60);
    const ricongiunta = piegaRiga(riga)
      .split('\r\n')
      .map((p, i) => (i === 0 ? p : p.slice(1)))
      .join('');
    expect(ricongiunta).toBe(riga);
    expect(ricongiunta).not.toContain('�');
  });

  it('tiene insieme le coppie surrogate', () => {
    const riga = 'X:' + '🎯'.repeat(30); // 4 byte l'una
    const pieghe = piegaRiga(riga).split('\r\n');
    for (const p of pieghe) {
      expect(byte(p)).toBeLessThanOrEqual(75);
    }
    expect(
      pieghe.map((p, i) => (i === 0 ? p : p.slice(1))).join(''),
      'nessuna emoji spezzata',
    ).toBe(riga);
  });
});

describe('file completo', () => {
  it('ha l’involucro richiesto e finisce con CRLF', () => {
    const ics = creaICS(evento());
    const righe = righeLogiche(ics);

    expect(righe[0]).toBe('BEGIN:VCALENDAR');
    expect(righe).toContain('VERSION:2.0');
    expect(righe.some((r) => r.startsWith('PRODID:'))).toBe(true);
    expect(righe.at(-1)).toBe('END:VCALENDAR');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  it('ogni riga finisce con CRLF, mai con solo LF', () => {
    const ics = creaICS(evento({ descrizione: 'Prima riga\nSeconda riga' }));
    // Nessun \n che non sia preceduto da \r.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it('porta orari, titolo e stato', () => {
    const righe = righeLogiche(creaICS(evento()));
    expect(righe).toContain('DTSTART:20260810T070000Z');
    expect(righe).toContain('DTEND:20260810T073000Z');
    expect(righe).toContain('DTSTAMP:20260806T120000Z');
    expect(righe).toContain('SUMMARY:Call con Marco');
    expect(righe).toContain('UID:prenotazione-1@invisionary');
    expect(righe).toContain('STATUS:CONFIRMED');
  });

  it('un appuntamento annullato è CANCELLED: è così che sparisce dal calendario', () => {
    const righe = righeLogiche(creaICS(evento({ annullato: true })));
    expect(righe).toContain('STATUS:CANCELLED');
  });

  it('descrizione e luogo compaiono solo se ci sono', () => {
    const senza = righeLogiche(creaICS(evento()));
    expect(senza.some((r) => r.startsWith('DESCRIPTION'))).toBe(false);
    expect(senza.some((r) => r.startsWith('LOCATION'))).toBe(false);

    const con = righeLogiche(creaICS(evento({ descrizione: 'Punto sulla rete', luogo: 'Zoom' })));
    expect(con).toContain('DESCRIPTION:Punto sulla rete');
    expect(con).toContain('LOCATION:Zoom');
  });

  it('più eventi, un solo involucro', () => {
    const ics = creaICSMultiplo([
      evento({ uid: 'a' }),
      evento({ uid: 'b', titolo: 'Seconda' }),
    ]);
    const righe = righeLogiche(ics);
    expect(righe.filter((r) => r === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(righe.filter((r) => r === 'BEGIN:VCALENDAR')).toHaveLength(1);
  });

  it('una data non valida scarta quell’evento, non tutto il file', () => {
    // Un DTSTART malformato fa rifiutare l'INTERO file: una riga sbagliata
    // porterebbe via anche quelle giuste.
    const ics = creaICSMultiplo([
      evento({ uid: 'buono' }),
      evento({ uid: 'rotto', inizio: new Date('non-una-data') }),
    ]);
    const righe = righeLogiche(ics);
    expect(righe.filter((r) => r === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(righe).toContain('UID:buono');
    expect(ics).not.toContain('NaN');
  });
});

describe('nome del file', () => {
  it('toglie accenti e caratteri scomodi', () => {
    expect(nomeFileICS('Call con Marco, martedì', new Date(Date.UTC(2026, 7, 10)))).toBe(
      'call-con-marco-martedi-20260810.ics',
    );
    expect(nomeFileICS('a/b\\c:d', new Date(Date.UTC(2026, 0, 1)))).toBe('a-b-c-d-20260101.ics');
  });

  it('regge un titolo vuoto o una data non valida', () => {
    expect(nomeFileICS('', new Date(Date.UTC(2026, 0, 1)))).toBe('appuntamento-20260101.ics');
    expect(nomeFileICS('Call', new Date('boh'))).toBe('call-appuntamento.ics');
  });
});

/** Lunghezza in byte UTF-8. */
function byte(s: string): number {
  return new TextEncoder().encode(s).length;
}
