/**
 * Test della conversione rubrica → contatti CRM (src/lib/device-contacts.ts).
 *
 * Solo la parte pura: leggere davvero la rubrica richiede un dispositivo e il
 * permesso dell'utente, e non è quello che può rompersi in silenzio. Quello che
 * può rompersi in silenzio è la conversione — una voce scartata di troppo, o un
 * numero normalizzato male, e il contatto sparisce senza che nessuno se ne
 * accorga.
 */
import { describe, expect, it } from 'vitest';

import { convertiRubrica, convertiVoce } from '@/lib/device-contacts';

describe('conversione di una voce', () => {
  it('prende nome, prima email e primo telefono', () => {
    expect(
      convertiVoce({
        id: 'c1',
        name: 'Mario Rossi',
        emails: [{ email: 'Mario@Email.IT' }, { email: 'altra@email.it' }],
        phoneNumbers: [{ number: '340 123 4567' }, { number: '02 1234567' }],
      }),
    ).toEqual({
      id: 'c1',
      nome: 'Mario Rossi',
      email: 'mario@email.it',
      telefono: '+393401234567',
    });
  });

  it('ricompone il nome da nome e cognome quando manca quello completo', () => {
    const v = convertiVoce({ id: 'c2', firstName: 'Giulia', lastName: 'Bianchi', phoneNumbers: [{ number: '3401111111' }] });
    expect(v?.nome).toBe('Giulia Bianchi');
  });

  it('regge un nome parziale', () => {
    const v = convertiVoce({ id: 'c3', firstName: 'Luca', phoneNumbers: [{ number: '3402222222' }] });
    expect(v?.nome).toBe('Luca');
  });

  it('scarta chi non ha nome: non ci sarebbe niente da mostrare', () => {
    expect(convertiVoce({ id: 'x', phoneNumbers: [{ number: '3401234567' }] })).toBeNull();
    expect(convertiVoce({ id: 'x', name: '   ', emails: [{ email: 'a@b.it' }] })).toBeNull();
  });

  it('scarta chi non ha né email né telefono: non è contattabile né riconoscibile', () => {
    expect(convertiVoce({ id: 'x', name: 'Solo Nome' })).toBeNull();
    expect(convertiVoce({ id: 'x', name: 'Numero Rotto', phoneNumbers: [{ number: 'abc' }] })).toBeNull();
  });

  it('basta uno dei due per tenerla', () => {
    expect(convertiVoce({ id: 'a', name: 'Solo Email', emails: [{ email: 'a@b.it' }] })).not.toBeNull();
    expect(convertiVoce({ id: 'b', name: 'Solo Tel', phoneNumbers: [{ number: '3401234567' }] })).not.toBeNull();
  });

  it('salta le voci vuote dentro gli elenchi', () => {
    const v = convertiVoce({
      id: 'c4',
      name: 'Anna',
      emails: [{}, { email: 'anna@email.it' }],
      phoneNumbers: [{}, { number: '3403333333' }],
    });
    expect(v).toMatchObject({ email: 'anna@email.it', telefono: '+393403333333' });
  });

  it('inventa un id solo se il dispositivo non lo dà', () => {
    expect(convertiVoce({ name: 'Senza Id', emails: [{ email: 'a@b.it' }] }, 7)?.id).toBe('rubrica-7');
  });
});

describe('conversione dell’intera rubrica', () => {
  it('scarta le voci inutilizzabili e ordina per nome', () => {
    const voci = convertiRubrica([
      { id: '1', name: 'Zoe', phoneNumbers: [{ number: '3401111111' }] },
      { id: '2', name: 'Anna', emails: [{ email: 'anna@x.it' }] },
      { id: '3', name: 'Senza contatti' },
      { id: '4', name: 'Marco', phoneNumbers: [{ number: '3402222222' }] },
    ]);
    expect(voci.map((v) => v.nome)).toEqual(['Anna', 'Marco', 'Zoe']);
  });

  it('ordina con le regole italiane', () => {
    const voci = convertiRubrica([
      { id: '1', name: 'Zaccaria', phoneNumbers: [{ number: '3401111111' }] },
      { id: '2', name: 'Àlvaro', phoneNumbers: [{ number: '3402222222' }] },
      { id: '3', name: 'Bianchi', phoneNumbers: [{ number: '3403333333' }] },
    ]);
    expect(voci.map((v) => v.nome)).toEqual(['Àlvaro', 'Bianchi', 'Zaccaria']);
  });

  it('una rubrica vuota non rompe nulla', () => {
    expect(convertiRubrica([])).toEqual([]);
  });
});
