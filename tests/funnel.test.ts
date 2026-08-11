/**
 * Test del funnel di acquisizione (src/lib/funnel.ts).
 *
 * Questa logica difende la PRIMA PORTA PUBBLICA dell'app: tutto il resto sta
 * dietro un login, un modulo su una pagina pubblica no. I test presidiano due
 * cose che si rompono in fretta e in silenzio:
 *
 * 1. I filtri anti-robot. Cento righe finte rendono il CRM inservibile, che è
 *    peggio di non avere il funnel.
 * 2. Il consenso. Nessuna spunta, nessun contatto — e mai un canale che il
 *    funnel non ha chiesto, altrimenti basterebbe modificare il modulo nel
 *    browser per regalarsi consensi.
 */
import { describe, expect, it } from 'vitest';

import {
  TEMPO_MINIMO_MS,
  classificaErroreLead,
  emailPlausibile,
  leadRimanenti,
  slugDaTitolo,
  slugValido,
  verificaInvio,
  type Canale,
  type Invio,
} from '@/lib/funnel';

function invio(extra: Partial<Invio> = {}): Invio {
  return {
    nome: 'Marco Rossi',
    email: 'marco.rossi@example.com',
    telefono: '',
    canali: ['email'],
    civetta: '',
    tempoCompilazione: 9000,
    ...extra,
  };
}

const RICHIESTI: Canale[] = ['email', 'whatsapp'];

describe('IL CASO CHE CONTA: i robot non passano', () => {
  it('il campo civetta pieno respinge, e viene controllato per primo', () => {
    // A un robot non si spiega cosa ha sbagliato: gli si dice di no e basta.
    // Anche con tutto il resto sbagliato, il motivo resta la civetta.
    expect(verificaInvio(invio({ civetta: 'http://spam' }), RICHIESTI)).toEqual({
      ok: false,
      motivo: 'civetta',
    });
    expect(
      verificaInvio(
        invio({ civetta: 'x', email: 'storta', canali: [], tempoCompilazione: 0 }),
        RICHIESTI,
      ),
    ).toEqual({ ok: false, motivo: 'civetta' });
  });

  it('compilato troppo in fretta perché l’abbia scritto una persona', () => {
    expect(verificaInvio(invio({ tempoCompilazione: 0 }), RICHIESTI)).toEqual({
      ok: false,
      motivo: 'troppo_veloce',
    });
    expect(verificaInvio(invio({ tempoCompilazione: TEMPO_MINIMO_MS - 1 }), RICHIESTI).ok).toBe(
      false,
    );
  });

  it('la soglia non respinge chi incolla i dati dal telefono', () => {
    // Tre secondi sono pochi per una persona e un'eternità per un robot.
    expect(TEMPO_MINIMO_MS).toBeLessThanOrEqual(3000);
    expect(verificaInvio(invio({ tempoCompilazione: TEMPO_MINIMO_MS }), RICHIESTI).ok).toBe(true);
  });
});

describe('serve un modo per ricontattare', () => {
  it('senza email né telefono non è un contatto, è un nome', () => {
    expect(verificaInvio(invio({ email: '', telefono: '' }), RICHIESTI)).toEqual({
      ok: false,
      motivo: 'nessun_recapito',
    });
  });

  it('basta il telefono', () => {
    expect(
      verificaInvio(
        invio({ email: '', telefono: '340 1234567', canali: ['whatsapp'] }),
        RICHIESTI,
      ).ok,
    ).toBe(true);
  });

  it('un’email storta viene respinta prima di partire', () => {
    expect(verificaInvio(invio({ email: 'non-una-email' }), RICHIESTI)).toEqual({
      ok: false,
      motivo: 'email_non_valida',
    });
  });
});

describe('il consenso', () => {
  it('nessuna spunta, nessun contatto', () => {
    expect(verificaInvio(invio({ canali: [] }), RICHIESTI)).toEqual({
      ok: false,
      motivo: 'nessun_consenso',
    });
  });

  it('un canale che il funnel non chiede viene rifiutato', () => {
    // Altrimenti basterebbe modificare il modulo nel browser per regalarsi
    // consensi che nessuno ha mai mostrato alla persona.
    expect(verificaInvio(invio({ canali: ['email', 'sms'] }), RICHIESTI)).toEqual({
      ok: false,
      motivo: 'canale_non_richiesto',
    });
  });

  it('più canali richiesti si possono spuntare insieme', () => {
    expect(
      verificaInvio(invio({ telefono: '3401234567', canali: ['email', 'whatsapp'] }), RICHIESTI).ok,
    ).toBe(true);
  });
});

describe('plausibilità dell’email', () => {
  it('accetta quelle normali, anche insolite', () => {
    for (const e of [
      'a@b.co',
      'marco.rossi@example.com',
      'nome+tag@sotto.dominio.it',
      "d'angelo@example.com",
    ]) {
      expect(emailPlausibile(e), e).toBe(true);
    }
  });

  it('scarta quello che non può essere un indirizzo', () => {
    for (const e of ['', 'marco', 'marco@', '@example.com', 'a b@c.it', 'marco@example']) {
      expect(emailPlausibile(e), e).toBe(false);
    }
  });

  it('resta larga di proposito: un contatto perso costa più di uno finto', () => {
    // L'unico modo per sapere se un indirizzo esiste è scriverci. Qui si
    // scarta solo l'impossibile.
    expect(emailPlausibile('probabilmente.finta@mailinator.com')).toBe(true);
  });
});

describe('slug', () => {
  it('rispecchia il CHECK del database', () => {
    expect(slugValido('corso-base')).toBe(true);
    expect(slugValido('webinar2026')).toBe(true);
    expect(slugValido('a')).toBe(false); // troppo corto
    expect(slugValido('-inizia-con-trattino')).toBe(false);
    expect(slugValido('finisce-con-trattino-')).toBe(false);
    expect(slugValido('Con-Maiuscole')).toBe(false);
    expect(slugValido('con spazi')).toBe(false);
    expect(slugValido('accentàto')).toBe(false);
  });

  it('lo ricava da un titolo, accenti compresi', () => {
    expect(slugDaTitolo('Corso base di rete')).toBe('corso-base-di-rete');
    expect(slugDaTitolo('Webinar — Trading è metodo!')).toBe('webinar-trading-e-metodo');
    expect(slugDaTitolo('  Doppi   spazi  ')).toBe('doppi-spazi');
  });

  it('quando non se ne ricava uno valido restituisce vuoto invece di inventarlo', () => {
    expect(slugDaTitolo('')).toBe('');
    expect(slugDaTitolo('!!!')).toBe('');
    expect(slugDaTitolo('a')).toBe('');
  });
});

describe('limite orario', () => {
  it('conta quanto resta', () => {
    expect(leadRimanenti(0, 60)).toBe(60);
    expect(leadRimanenti(59, 60)).toBe(1);
    expect(leadRimanenti(60, 60)).toBe(0);
    expect(leadRimanenti(500, 60), 'mai negativo').toBe(0);
  });

  it('un massimo assurdo non apre le porte', () => {
    // Qui zero significa davvero zero: un funnel che non accetta niente è una
    // scelta legittima, e sbagliare verso «tutto aperto» sarebbe grave.
    expect(leadRimanenti(0, 0)).toBe(0);
    expect(leadRimanenti(0, -5)).toBe(0);
    expect(leadRimanenti(0, NaN)).toBe(0);
  });
});

describe('errori del database', () => {
  it('distingue i casi che meritano messaggi diversi', () => {
    expect(classificaErroreLead({ code: 'P0004' })).toBe('funnel_assente');
    expect(classificaErroreLead({ code: 'P0005' })).toBe('troppe_richieste');
    expect(classificaErroreLead({ code: 'P0006' })).toBe('nessun_recapito');
    expect(classificaErroreLead({ code: '23505' })).toBe('generico');
    expect(classificaErroreLead(null)).toBe('generico');
  });
});
