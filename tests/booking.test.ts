/**
 * Test della logica di prenotazione (src/lib/booking.ts).
 *
 * Le date si costruiscono dai componenti locali (`new Date(2026, 7, 10, 9)`),
 * non da stringhe ISO con offset: così le asserzioni valgono su qualunque
 * macchina, indipendentemente dal fuso di chi lancia i test.
 */
import { describe, expect, it } from 'vitest';

import {
  chiaveGiorno,
  classificaErrore,
  fusoDaSegnalare,
  minutiDaOrario,
  orarioDaMinuti,
  raggruppaSlot,
  verificaRegola,
  type Slot,
} from '@/lib/booking';

/** Uno slot a partire da componenti locali, come li vedrebbe chi guarda. */
function slot(anno: number, mese: number, giorno: number, ora: number, minuti = 0): Slot {
  const inizio = new Date(anno, mese - 1, giorno, ora, minuti);
  const fine = new Date(inizio.getTime() + 30 * 60_000);
  return { inizio: inizio.toISOString(), fine: fine.toISOString() };
}

describe('raggruppamento per giornata', () => {
  it('mette insieme gli slot dello stesso giorno, in ordine', () => {
    const gruppi = raggruppaSlot([
      slot(2026, 8, 11, 15, 30),
      slot(2026, 8, 10, 9, 0),
      slot(2026, 8, 11, 9, 0),
      slot(2026, 8, 10, 11, 0),
    ]);

    expect(gruppi).toHaveLength(2);
    expect(gruppi[0].chiave).toBe('2026-08-10');
    expect(gruppi[1].chiave).toBe('2026-08-11');
    expect(gruppi[0].slot).toHaveLength(2);
    expect(new Date(gruppi[0].slot[0].inizio).getHours()).toBe(9);
    expect(new Date(gruppi[0].slot[1].inizio).getHours()).toBe(11);
    expect(new Date(gruppi[1].slot[0].inizio).getHours()).toBe(9);
  });

  it('la data del gruppo è la mezzanotte locale, non un istante UTC', () => {
    // Se si usasse toISOString() per la chiave, uno slot serale finirebbe nel
    // giorno dopo per chi sta a est di Greenwich.
    const gruppi = raggruppaSlot([slot(2026, 8, 10, 23, 30)]);
    expect(gruppi[0].chiave).toBe('2026-08-10');
    expect(gruppi[0].data.getHours()).toBe(0);
    expect(gruppi[0].data.getDate()).toBe(10);
  });

  it('scarta le date non valide invece di mostrarle', () => {
    const gruppi = raggruppaSlot([
      { inizio: 'non-una-data', fine: 'nemmeno' },
      slot(2026, 8, 10, 9, 0),
    ]);
    expect(gruppi).toHaveLength(1);
    expect(gruppi[0].slot).toHaveLength(1);
  });

  it('nessuno slot, nessun gruppo', () => {
    expect(raggruppaSlot([])).toEqual([]);
  });

  it('chiaveGiorno impagina mese e giorno a due cifre', () => {
    expect(chiaveGiorno(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(chiaveGiorno(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('orari', () => {
  it('converte avanti e indietro', () => {
    expect(minutiDaOrario('09:00')).toBe(540);
    expect(minutiDaOrario('9:30')).toBe(570);
    expect(minutiDaOrario('23:59')).toBe(1439);
    expect(minutiDaOrario('14:00:00'), 'il formato di Postgres').toBe(840);
    expect(orarioDaMinuti(540)).toBe('09:00');
    expect(orarioDaMinuti(1439)).toBe('23:59');
  });

  it('rifiuta quello che non è un orario', () => {
    expect(minutiDaOrario('')).toBeNull();
    expect(minutiDaOrario('25:00')).toBeNull();
    expect(minutiDaOrario('09:75')).toBeNull();
    expect(minutiDaOrario('nove')).toBeNull();
    expect(minutiDaOrario('0900')).toBeNull();
  });
});

describe('regole di disponibilità', () => {
  it('9:00–12:00 a 30 minuti fa 6 appuntamenti, senza avanzo', () => {
    const r = verificaRegola('09:00', '12:00', 30);
    expect(r.valida).toBe(true);
    if (!r.valida) return;
    expect(r.slotGenerati).toBe(6);
    expect(r.avanzo).toBe(0);
  });

  it('segnala i minuti che restano fuori', () => {
    // 9:00–11:00 a 45 minuti: due appuntamenti, e mezz'ora che non basta.
    const r = verificaRegola('09:00', '11:00', 45);
    expect(r.valida).toBe(true);
    if (!r.valida) return;
    expect(r.slotGenerati).toBe(2);
    expect(r.avanzo).toBe(30);
  });

  it('rifiuta una finestra che non contiene nemmeno un appuntamento', () => {
    expect(verificaRegola('09:00', '09:20', 30)).toEqual({
      valida: false,
      motivo: 'finestra_troppo_corta',
    });
  });

  it('rifiuta gli ingressi impossibili', () => {
    expect(verificaRegola('12:00', '09:00', 30)).toEqual({
      valida: false,
      motivo: 'fine_prima_di_inizio',
    });
    expect(verificaRegola('09:00', '09:00', 30)).toEqual({
      valida: false,
      motivo: 'fine_prima_di_inizio',
    });
    expect(verificaRegola('boh', '12:00', 30)).toEqual({
      valida: false,
      motivo: 'orario_non_valido',
    });
    expect(verificaRegola('09:00', '12:00', 0).valida).toBe(false);
    expect(verificaRegola('09:00', '12:00', 4).valida).toBe(false);
    expect(verificaRegola('09:00', '12:00', 481).valida).toBe(false);
    expect(verificaRegola('09:00', '12:00', 30.5).valida).toBe(false);
  });
});

describe('errori del database', () => {
  it('23P01 è la corsa persa: qualcuno ha preso lo slot per primo', () => {
    // È il caso che conta: due persone toccano lo stesso orario insieme.
    // Il vincolo di esclusione ne rifiuta una, e va detto in italiano.
    expect(classificaErrore({ code: '23P01', message: 'conflicting key value' })).toBe(
      'slot_occupato',
    );
  });

  it('il rifiuto del trigger è un orario non pubblicato', () => {
    expect(classificaErrore({ code: 'P0001', message: 'Questo orario non è fra quelli disponibili.' })).toBe(
      'slot_non_disponibile',
    );
    expect(classificaErrore({ code: '23514' })).toBe('slot_non_disponibile');
  });

  it('senza codice si ripiega sul messaggio', () => {
    expect(
      classificaErrore({ message: 'violates exclusion constraint bookings_host_niente_sovrapposizioni' }),
    ).toBe('slot_occupato');
    expect(classificaErrore({ message: 'Questo orario non è fra quelli disponibili.' })).toBe(
      'slot_non_disponibile',
    );
  });

  it('quello che non si riconosce resta generico', () => {
    expect(classificaErrore(null)).toBe('generico');
    expect(classificaErrore(undefined)).toBe('generico');
    expect(classificaErrore('rete assente')).toBe('generico');
    expect(classificaErrore({ code: '42501', message: 'permission denied' })).toBe('generico');
  });
});

describe('avviso sul fuso', () => {
  it('non avvisa quando non si sa, o quando coincide', () => {
    expect(fusoDaSegnalare(null)).toBe(false);
    expect(fusoDaSegnalare(undefined)).toBe(false);
    expect(fusoDaSegnalare('')).toBe(false);
  });

  it('avvisa solo se il fuso dell’host è diverso da quello del dispositivo', () => {
    const mio = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(fusoDaSegnalare(mio)).toBe(false);
    expect(fusoDaSegnalare(mio === 'Pacific/Kiritimati' ? 'Europe/Rome' : 'Pacific/Kiritimati')).toBe(
      true,
    );
  });
});
