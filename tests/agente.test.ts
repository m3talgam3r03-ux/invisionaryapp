/**
 * Test della memoria e del tetto di spesa dell'agente (src/lib/agente.ts).
 *
 * Il caso che questi test presidiano più di ogni altro è uno: **il marcatore
 * non deve mai arrivare all'utente**. È un'istruzione interna dell'agente, e
 * vederla a video significa mostrare come si comanda l'agente a chi legge —
 * oltre che sembrare rotto.
 *
 * ⚠️ `estraiMemorie` è duplicata in supabase/functions/_shared/memoria.ts,
 * perché Deno e React Native non condividono moduli. La copia testata è
 * questa: se le due divergono, il server cambia comportamento in silenzio.
 */
import { describe, expect, it } from 'vitest';

import {
  classificaErroreAgente,
  domandeRimaste,
  estraiMemorie,
  statoBudget,
  type Budget,
} from '@/lib/agente';

function budget(extra: Partial<Budget> = {}): Budget {
  return {
    richiesteOggi: 0,
    richiesteMax: 40,
    tokenMeseUsati: 0,
    tokenMeseMax: 300_000,
    ...extra,
  };
}

describe('IL CASO CHE CONTA: il marcatore non arriva mai all’utente', () => {
  it('viene tolto dalla risposta', () => {
    const { risposta } = estraiMemorie(
      'Ti conviene partire dai contatti caldi.\n\n<<<RICORDA:\nobiettivo: vuole diventare leader\n>>>',
    );
    expect(risposta).toBe('Ti conviene partire dai contatti caldi.');
    expect(risposta).not.toContain('RICORDA');
    expect(risposta).not.toContain('<<<');
  });

  it('viene tolto anche quando è malformato o vuoto', () => {
    // Se resta a video, l'utente vede le istruzioni interne dell'agente.
    for (const testo of [
      'Risposta.\n<<<RICORDA:>>>',
      'Risposta.\n<<<RICORDA:\n\n>>>',
      'Risposta.\n<<<RICORDA:\nab\n>>>', // fatto troppo corto: scartato
      'Risposta.\n<<<RICORDA:\n- - -\n>>>',
    ]) {
      const { risposta } = estraiMemorie(testo);
      expect(risposta, testo).toBe('Risposta.');
      expect(risposta).not.toContain('RICORDA');
    }
  });

  it('ne toglie più di uno, se il modello ne emette più di uno', () => {
    const { risposta, fatti } = estraiMemorie(
      'Parte uno.<<<RICORDA:\nobiettivo: aprire una squadra\n>>> Parte due.<<<RICORDA:\nvincolo: lavora solo la sera\n>>>',
    );
    expect(risposta).not.toContain('RICORDA');
    expect(fatti).toHaveLength(2);
  });

  it('una risposta senza marcatore resta identica', () => {
    const testo = 'Il lotto si ricava dal rischio, non dall’istinto.';
    const { risposta, fatti } = estraiMemorie(testo);
    expect(risposta).toBe(testo);
    expect(fatti).toEqual([]);
  });
});

describe('i fatti estratti', () => {
  it('legge categoria e fatto', () => {
    const { fatti } = estraiMemorie(
      '<<<RICORDA:\nobiettivo: vuole passare a leader entro l’anno\npreferenza: preferisce le call la sera\n>>>',
    );
    expect(fatti).toEqual([
      { categoria: 'obiettivo', fatto: 'vuole passare a leader entro l’anno' },
      { categoria: 'preferenza', fatto: 'preferisce le call la sera' },
    ]);
  });

  it('senza categoria valida ripiega su «situazione»', () => {
    const { fatti } = estraiMemorie('<<<RICORDA:\nha appena iniziato in una nuova città\n>>>');
    expect(fatti[0].categoria).toBe('situazione');
    expect(fatti[0].fatto).toBe('ha appena iniziato in una nuova città');
  });

  it('una parola sconosciuta prima dei due punti resta parte del fatto', () => {
    // Altrimenti «Roma: ci si è appena trasferito» perderebbe «Roma».
    const { fatti } = estraiMemorie('<<<RICORDA:\nRoma: ci si è appena trasferito\n>>>');
    expect(fatti[0].fatto).toBe('Roma: ci si è appena trasferito');
    expect(fatti[0].categoria).toBe('situazione');
  });

  it('tollera trattini ed elenchi puntati', () => {
    const { fatti } = estraiMemorie(
      '<<<RICORDA:\n- obiettivo: dieci clienti entro giugno\n• vincolo: niente trasferte\n>>>',
    );
    expect(fatti.map((f) => f.categoria)).toEqual(['obiettivo', 'vincolo']);
  });

  it('scarta i fatti fuori misura, come farebbe il database', () => {
    const troppoLungo = 'x'.repeat(301);
    const { fatti } = estraiMemorie(`<<<RICORDA:\nab\n${troppoLungo}\nok questo va bene\n>>>`);
    expect(fatti).toHaveLength(1);
    expect(fatti[0].fatto).toBe('ok questo va bene');
  });

  it('non ripete lo stesso fatto due volte nella stessa risposta', () => {
    // Scartarli qui evita scritture destinate a fallire sull'indice unico.
    const { fatti } = estraiMemorie(
      '<<<RICORDA:\nobiettivo: diventare leader\nOBIETTIVO: Diventare Leader\n>>>',
    );
    expect(fatti).toHaveLength(1);
  });
});

describe('tetto di spesa', () => {
  it('sta bene finché è sotto l’80%', () => {
    expect(statoBudget(budget({ richiesteOggi: 10 }))).toBe('ok');
    expect(statoBudget(budget({ richiesteOggi: 31 }))).toBe('ok');
  });

  it('avvisa all’80%, non a filo di limite', () => {
    // A filo non si fa più in tempo a cambiare comportamento.
    expect(statoBudget(budget({ richiesteOggi: 32 }))).toBe('quasi');
    expect(statoBudget(budget({ tokenMeseUsati: 240_000 }))).toBe('quasi');
  });

  it('è esaurito quando uno QUALSIASI dei due tetti è pieno', () => {
    expect(statoBudget(budget({ richiesteOggi: 40 }))).toBe('esaurito');
    expect(statoBudget(budget({ tokenMeseUsati: 300_000 }))).toBe('esaurito');
    expect(statoBudget(budget({ richiesteOggi: 100 }))).toBe('esaurito');
  });

  it('un massimo a zero significa «nessun limite», non «limite zero»', () => {
    // È il modo in cui un admin toglie il tetto: se lo leggessimo come zero,
    // toglierlo lo renderebbe invalicabile.
    expect(statoBudget(budget({ richiesteMax: 0, richiesteOggi: 9999 }))).toBe('ok');
    expect(statoBudget(budget({ tokenMeseMax: 0, tokenMeseUsati: 9_000_000 }))).toBe('ok');
    expect(domandeRimaste(budget({ richiesteMax: 0 }))).toBeNull();
  });

  it('quante domande restano', () => {
    expect(domandeRimaste(budget({ richiesteOggi: 5 }))).toBe(35);
    expect(domandeRimaste(budget({ richiesteOggi: 40 }))).toBe(0);
    expect(domandeRimaste(budget({ richiesteOggi: 99 })), 'mai negativo').toBe(0);
  });
});

describe('errori del tetto', () => {
  it('giorno e mese sono due attese diverse, e due messaggi diversi', () => {
    expect(classificaErroreAgente({ code: 'P0003' })).toBe('limite_giornaliero');
    expect(classificaErroreAgente({ code: 'P0002' })).toBe('limite_mensile');
  });

  it('senza codice si ripiega sul messaggio', () => {
    expect(classificaErroreAgente({ message: 'Hai raggiunto il limite di domande di oggi.' })).toBe(
      'limite_giornaliero',
    );
    expect(
      classificaErroreAgente({ message: 'Hai raggiunto il limite di utilizzo mensile.' }),
    ).toBe('limite_mensile');
  });

  it('quello che non si riconosce resta generico', () => {
    expect(classificaErroreAgente(null)).toBe('generico');
    expect(classificaErroreAgente({ code: '42501' })).toBe('generico');
    expect(classificaErroreAgente('rete assente')).toBe('generico');
  });
});
