/**
 * Test della traduzione degli errori (src/lib/errori.ts).
 *
 * Il punto che presidiano è uno solo, e vale più di tutti gli altri: il testo
 * grezzo del database non deve MAI finire sotto gli occhi di chi usa l'app.
 * Non perché sia brutto, ma perché non aiuta chi legge e racconta com'è fatto
 * il database a chiunque stia guardando lo schermo.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { categoriaErrore, messaggioErrore } from '@/lib/errori';

/** Un errore PostgREST come arriva davvero da supabase-js. */
function postgrest(code: string, message: string) {
  return { code, message, details: null, hint: null };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('categoriaErrore — codici', () => {
  it('riconosce il rifiuto delle policy', () => {
    expect(categoriaErrore(postgrest('42501', 'insufficient privilege'))).toBe('permesso');
    expect(categoriaErrore(postgrest('PGRST301', 'JWT'))).toBe('permesso');
  });

  it('riconosce la riga che non c’è', () => {
    expect(categoriaErrore(postgrest('PGRST116', 'no rows'))).toBe('nonTrovato');
  });

  it('riconosce il duplicato e il vincolo di collegamento', () => {
    expect(categoriaErrore(postgrest('23505', 'duplicate key'))).toBe('duplicato');
    expect(categoriaErrore(postgrest('23503', 'fk'))).toBe('collegato');
  });

  it('riconosce il timeout della query', () => {
    expect(categoriaErrore(postgrest('57014', 'canceling statement'))).toBe('lento');
  });

  it('il codice ha la precedenza sul testo', () => {
    // Il testo direbbe «rete», il codice dice «permesso». Vince il codice:
    // è preciso, mentre il testo cambia con le versioni della libreria.
    expect(categoriaErrore(postgrest('42501', 'failed to fetch'))).toBe('permesso');
  });
});

describe('categoriaErrore — testo', () => {
  it('riconosce la rete irraggiungibile in tutte le sue forme', () => {
    for (const m of ['Failed to fetch', 'Network request failed', 'NetworkError', 'Load failed']) {
      expect(categoriaErrore(new Error(m))).toBe('rete');
    }
  });

  it('riconosce la sessione scaduta', () => {
    expect(categoriaErrore(new Error('JWT expired'))).toBe('sessione');
  });

  it('riconosce il rifiuto RLS scritto per esteso', () => {
    expect(
      categoriaErrore(new Error('new row violates row-level security policy for table "clients"')),
    ).toBe('permesso');
    expect(categoriaErrore(new Error('permission denied for table renewals'))).toBe('permesso');
  });

  it('quello che non conosce resta sconosciuto', () => {
    expect(categoriaErrore(new Error('qualcosa di mai visto'))).toBe('sconosciuto');
  });
});

describe('categoriaErrore — forme strane', () => {
  it('regge null, undefined, stringhe e oggetti vuoti', () => {
    for (const e of [null, undefined, '', {}, 0, []]) {
      expect(categoriaErrore(e)).toBe('sconosciuto');
    }
  });

  it('legge anche un errore passato come stringa', () => {
    expect(categoriaErrore('Failed to fetch')).toBe('rete');
  });

  it('un codice non testuale non fa saltare niente', () => {
    expect(categoriaErrore({ code: 42501, message: 'x' })).toBe('sconosciuto');
  });
});

describe('messaggioErrore', () => {
  it('non mostra mai il testo grezzo del database', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const grezzi = [
      'new row violates row-level security policy for table "clients"',
      'JWT expired',
      'duplicate key value violates unique constraint "clients_pkey"',
      'canceling statement due to statement timeout',
    ];
    for (const g of grezzi) {
      const mostrato = messaggioErrore(new Error(g));
      expect(mostrato).not.toContain(g);
      expect(mostrato.toLowerCase()).not.toMatch(/policy|jwt|constraint|statement|table/);
    }
  });

  it('nemmeno per un errore che non riconosce', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mostrato = messaggioErrore(new Error('ERRORE INTERNO XYZ-42'));
    expect(mostrato).not.toContain('XYZ-42');
  });

  it('ma lo scrive nei log, altrimenti diventa impossibile da capire', () => {
    const spia = vi.spyOn(console, 'error').mockImplementation(() => {});
    messaggioErrore(new Error('ERRORE INTERNO XYZ-42'));
    expect(spia).toHaveBeenCalledWith(expect.any(String), 'ERRORE INTERNO XYZ-42');
  });

  it('il contesto sostituisce solo il messaggio generico', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(messaggioErrore(new Error('boh'), 'Impossibile caricare i clienti')).toBe(
      'Impossibile caricare i clienti',
    );
  });

  it('il contesto NON copre quello che il database ha detto davvero', () => {
    // «Impossibile caricare i clienti» al posto di «non hai i permessi»
    // nasconderebbe l'unica informazione utile: riprovare non servirà.
    const m = messaggioErrore(postgrest('42501', 'denied'), 'Impossibile caricare i clienti');
    expect(m).toContain('permessi');
  });

  it('per la rete dice che è la rete, non che è colpa dell’utente', () => {
    expect(messaggioErrore(new Error('Failed to fetch'))).toMatch(/connessione/i);
  });

  it('non scrive nei log quello che ha riconosciuto', () => {
    const spia = vi.spyOn(console, 'error').mockImplementation(() => {});
    messaggioErrore(new Error('Failed to fetch'));
    expect(spia).not.toHaveBeenCalled();
  });
});

describe('errori sollevati da noi', () => {
  it('«ultimo_amministratore» diventa una frase, non un identificatore', () => {
    // Il nome dell'eccezione è scelto apposta perché arrivi qui riconoscibile.
    // Senza questa riga l'admin leggerebbe letteralmente «ultimo_amministratore».
    const m = messaggioErrore(new Error('ultimo_amministratore'));
    expect(m).not.toContain('_');
    expect(m).toMatch(/amministratore/i);
  });

  it('lo riconosce anche dentro il messaggio completo di Postgres', () => {
    const grezzo = new Error('P0001: ultimo_amministratore\nHINT: Nomina un altro...');
    expect(categoriaErrore(grezzo)).toBe('ultimoAdmin');
  });
});
