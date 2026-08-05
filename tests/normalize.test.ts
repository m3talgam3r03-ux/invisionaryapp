/**
 * Test della normalizzazione (src/lib/normalize.ts).
 *
 * È la parte che decide se la deduplica funziona. Un errore qui non dà errori:
 * fa semplicemente entrare la stessa persona due o tre volte in lista, e ce se
 * ne accorge mesi dopo.
 */
import { describe, expect, it } from 'vitest';

import {
  chiaveDeduplica,
  deduplica,
  normalizzaEmail,
  normalizzaTelefono,
  sembraEmail,
  separaContatto,
} from '@/lib/normalize';

describe('email', () => {
  it('porta tutto in minuscolo e toglie gli spazi', () => {
    expect(normalizzaEmail('  Mario.Rossi@Email.IT ')).toBe('mario.rossi@email.it');
  });

  it('vuoto e assente diventano null', () => {
    expect(normalizzaEmail('')).toBeNull();
    expect(normalizzaEmail('   ')).toBeNull();
    expect(normalizzaEmail(null)).toBeNull();
    expect(normalizzaEmail(undefined)).toBeNull();
  });

  it('riconosce cosa è un’email e cosa no', () => {
    expect(sembraEmail('a@b.it')).toBe(true);
    expect(sembraEmail('mario.rossi@email.co.uk')).toBe(true);
    expect(sembraEmail('3401234567')).toBe(false);
    expect(sembraEmail('mario@')).toBe(false);
    expect(sembraEmail('mario@email')).toBe(false);
  });
});

describe('telefono in E.164', () => {
  it('le tre scritture dello stesso numero danno lo stesso risultato', () => {
    // È il caso per cui esiste tutto questo modulo.
    const atteso = '+393401234567';
    expect(normalizzaTelefono('+39 340 123 4567')).toBe(atteso);
    expect(normalizzaTelefono('3401234567')).toBe(atteso);
    expect(normalizzaTelefono('0039 340 1234567')).toBe(atteso);
    expect(normalizzaTelefono('340-123-4567')).toBe(atteso);
    expect(normalizzaTelefono('(340) 1234567')).toBe(atteso);
  });

  it('per l’Italia lo zero iniziale resta: è parte del numero', () => {
    // Un fisso di Milano è +39 02 1234567. Togliere lo zero, come si fa in
    // altri paesi, renderebbe irraggiungibile ogni numero fisso.
    expect(normalizzaTelefono('02 1234567')).toBe('+39021234567');
    expect(normalizzaTelefono('06 12345678')).toBe('+390612345678');
  });

  it('fuori dall’Italia lo zero iniziale è un prefisso interurbano e si toglie', () => {
    expect(normalizzaTelefono('020 7946 0958', '+44')).toBe('+442079460958');
  });

  it('rispetta un prefisso internazionale già presente', () => {
    expect(normalizzaTelefono('+44 20 7946 0958')).toBe('+442079460958');
    expect(normalizzaTelefono('+1 415 555 2671')).toBe('+14155552671');
  });

  it('accetta un prefisso di default diverso', () => {
    expect(normalizzaTelefono('7946 0958', '+44')).toBe('+4479460958');
  });

  it('scarta ciò che non è un numero plausibile', () => {
    expect(normalizzaTelefono('123')).toBeNull(); // troppo corto
    expect(normalizzaTelefono('12345678901234567890')).toBeNull(); // troppo lungo
    expect(normalizzaTelefono('non un numero')).toBeNull();
    expect(normalizzaTelefono('')).toBeNull();
    expect(normalizzaTelefono(null)).toBeNull();
  });

  it('un «+» in mezzo rende il valore inaffidabile', () => {
    expect(normalizzaTelefono('340+123+4567')).toBeNull();
  });
});

describe('campo contatto libero', () => {
  it('riconosce un’email da sola', () => {
    expect(separaContatto('mario@email.it')).toEqual({ email: 'mario@email.it', telefono: null });
  });

  it('riconosce un telefono da solo', () => {
    expect(separaContatto('340 1234567')).toEqual({ email: null, telefono: '+393401234567' });
  });

  it('separa email e telefono scritti insieme', () => {
    expect(separaContatto('mario@email.it, 340 1234567')).toEqual({
      email: 'mario@email.it',
      telefono: '+393401234567',
    });
  });

  it('regge separatori diversi', () => {
    expect(separaContatto('mario@email.it; +393401234567')).toEqual({
      email: 'mario@email.it',
      telefono: '+393401234567',
    });
  });

  it('su un valore vuoto non inventa niente', () => {
    expect(separaContatto('')).toEqual({ email: null, telefono: null });
    expect(separaContatto(null)).toEqual({ email: null, telefono: null });
  });
});

describe('chiave di deduplica', () => {
  it('l’email ha la precedenza: un numero di casa può essere di due persone', () => {
    expect(chiaveDeduplica({ email: 'a@b.it', telefono: '3401234567' })).toBe('email:a@b.it');
  });

  it('senza email si usa il telefono', () => {
    expect(chiaveDeduplica({ telefono: '340 1234567' })).toBe('tel:+393401234567');
  });

  it('senza nessuno dei due non c’è chiave', () => {
    expect(chiaveDeduplica({})).toBeNull();
    expect(chiaveDeduplica({ email: '', telefono: 'ciao' })).toBeNull();
  });
});

describe('deduplica di una lista', () => {
  it('riconosce come doppione la stessa email scritta diversamente', () => {
    const { tenute, scartate } = deduplica([
      { nome: 'Mario', email: 'Mario@Email.IT' },
      { nome: 'Mario Rossi', email: 'mario@email.it' },
    ]);
    expect(tenute).toHaveLength(1);
    expect(scartate).toHaveLength(1);
    expect(tenute[0].nome, 'si tiene la prima occorrenza').toBe('Mario');
  });

  it('riconosce come doppione lo stesso numero in formati diversi', () => {
    const { tenute, scartate } = deduplica([
      { nome: 'A', telefono: '+39 340 123 4567' },
      { nome: 'B', telefono: '3401234567' },
    ]);
    expect(tenute).toHaveLength(1);
    expect(scartate).toHaveLength(1);
  });

  it('non scarta persone diverse', () => {
    const { tenute } = deduplica([
      { nome: 'A', email: 'a@x.it' },
      { nome: 'B', email: 'b@x.it' },
      { nome: 'C', telefono: '3401111111' },
    ]);
    expect(tenute).toHaveLength(3);
  });

  it('le righe senza email né telefono passano tutte', () => {
    // Scartarle vorrebbe dire perdere contatti solo perché incompleti.
    const righe: { nome: string; email?: string | null }[] = [
      { nome: 'A' },
      { nome: 'B' },
      { nome: 'C' },
    ];
    const { tenute, scartate } = deduplica(righe);
    expect(tenute).toHaveLength(3);
    expect(scartate).toHaveLength(0);
  });

  it('una lista vuota non rompe nulla', () => {
    expect(deduplica([])).toEqual({ tenute: [], scartate: [] });
  });
});
