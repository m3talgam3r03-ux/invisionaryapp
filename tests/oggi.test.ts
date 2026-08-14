/**
 * Test di «cosa richiede attenzione oggi» (src/lib/oggi.ts).
 *
 * Il punto che presidiano: la dashboard non deve inventare urgenze, e non deve
 * contare due volte lo stesso rinnovo. Un numero gonfiato fa sembrare il lavoro
 * il doppio di quello che è, e chi lo scopre smette di fidarsi della schermata.
 */
import { describe, expect, it } from 'vitest';

import {
  GIORNI_PREAVVISO,
  giorniA,
  impegniDelGiorno,
  prossimoAppuntamento,
  tuttoInOrdine,
  type PrenotazioneMinima,
} from '@/lib/oggi';
import type { RenewalWithClient } from '@/types/models';

const IO = 'io';
const ALTRO = 'altro';
const OGGI = new Date('2026-08-14T10:30:00Z');

function rinnovo(p: Partial<RenewalWithClient>): RenewalWithClient {
  return {
    id: Math.random().toString(36),
    client_id: null,
    owner_id: IO,
    prodotto: null,
    current_due_date: '2026-12-31',
    interval_days: 30,
    status: 'attivo',
    requested_at: null,
    requested_by: null,
    approved_at: null,
    approved_by: null,
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    client: null,
    ...p,
  } as RenewalWithClient;
}

function prenotazione(p: Partial<PrenotazioneMinima>): PrenotazioneMinima {
  return {
    inizio: '2026-08-20T09:00:00Z',
    stato: 'confermata',
    hostId: ALTRO,
    guestId: IO,
    hostNome: 'Marco',
    guestNome: 'Io',
    ...p,
  };
}

describe('giorniA', () => {
  it('conta i giorni di calendario, non le ore', () => {
    // Sono le 10:30 di oggi: una scadenza OGGI è a zero giorni, non a −1.
    expect(giorniA('2026-08-14', OGGI)).toBe(0);
    expect(giorniA('2026-08-15', OGGI)).toBe(1);
    expect(giorniA('2026-08-13', OGGI)).toBe(-1);
  });

  it('regge una data con l’orario attaccato', () => {
    expect(giorniA('2026-08-16T23:59:59Z', OGGI)).toBe(2);
  });

  it('una data illeggibile non diventa un’urgenza', () => {
    // Infinito, non zero: zero la farebbe sembrare in scadenza oggi.
    expect(giorniA('mai', OGGI)).toBe(Number.POSITIVE_INFINITY);
  });

  it('attraversa il cambio di mese', () => {
    expect(giorniA('2026-09-01', new Date('2026-08-31T12:00:00Z'))).toBe(1);
  });
});

describe('impegniDelGiorno — rinnovi', () => {
  it('senza niente in sospeso non inventa urgenze', () => {
    const impegni = impegniDelGiorno([], [], OGGI, IO, false);
    expect(impegni).toEqual([]);
    expect(tuttoInOrdine(impegni)).toBe(true);
  });

  it('mette gli scaduti per primi', () => {
    const impegni = impegniDelGiorno(
      [
        rinnovo({ current_due_date: '2026-08-20' }), // in scadenza
        rinnovo({ current_due_date: '2026-08-01' }), // passata
      ],
      [],
      OGGI,
      IO,
      false,
    );
    expect(impegni[0]).toEqual({ tipo: 'scaduti', quanti: 1 });
    expect(impegni[1]).toEqual({ tipo: 'in_scadenza', quanti: 1, giorni: GIORNI_PREAVVISO });
  });

  it('lo stato «scaduto» vale anche con la data nel futuro', () => {
    const impegni = impegniDelGiorno(
      [rinnovo({ status: 'scaduto', current_due_date: '2026-12-31' })],
      [],
      OGGI,
      IO,
      false,
    );
    expect(impegni).toEqual([{ tipo: 'scaduti', quanti: 1 }]);
  });

  it('gli annullati non contano', () => {
    const impegni = impegniDelGiorno(
      [rinnovo({ status: 'annullato', current_due_date: '2026-01-01' })],
      [],
      OGGI,
      IO,
      false,
    );
    expect(impegni).toEqual([]);
  });

  it('oltre il preavviso non è ancora roba di oggi', () => {
    const impegni = impegniDelGiorno(
      [rinnovo({ current_due_date: '2026-09-30' })],
      [],
      OGGI,
      IO,
      false,
    );
    expect(impegni).toEqual([]);
  });

  it('il giorno esatto del preavviso è dentro', () => {
    // 14 giorni da 14/08 = 28/08.
    const impegni = impegniDelGiorno(
      [rinnovo({ current_due_date: '2026-08-28' })],
      [],
      OGGI,
      IO,
      false,
    );
    expect(impegni).toEqual([{ tipo: 'in_scadenza', quanti: 1, giorni: 14 }]);
  });
});

describe('impegniDelGiorno — approvazioni', () => {
  const inAttesa = { status: 'in_attesa_approvazione' as const, current_due_date: '2026-08-20' };

  it('chi non può approvare non se le vede chiedere', () => {
    const impegni = impegniDelGiorno(
      [rinnovo({ ...inAttesa, owner_id: ALTRO })],
      [],
      OGGI,
      IO,
      false,
    );
    expect(impegni).toEqual([]);
  });

  it('chi può approvare le vede', () => {
    const impegni = impegniDelGiorno([rinnovo({ ...inAttesa, owner_id: ALTRO })], [], OGGI, IO, true);
    expect(impegni).toEqual([{ tipo: 'da_approvare', quanti: 1 }]);
  });

  it('il proprio rinnovo in attesa non è un’azione mia', () => {
    // Aspetto che decida qualcun altro: non è lavoro sulla mia scrivania.
    const impegni = impegniDelGiorno([rinnovo({ ...inAttesa, owner_id: IO })], [], OGGI, IO, true);
    expect(impegni).toEqual([]);
  });

  it('un rinnovo sta in un secchiello solo', () => {
    // In attesa di approvazione E in scadenza fra sei giorni: conta una volta.
    const impegni = impegniDelGiorno(
      [rinnovo({ ...inAttesa, owner_id: ALTRO, current_due_date: '2026-08-20' })],
      [],
      OGGI,
      IO,
      true,
    );
    expect(impegni).toEqual([{ tipo: 'da_approvare', quanti: 1 }]);
  });

  it('scaduto batte in attesa', () => {
    const impegni = impegniDelGiorno(
      [rinnovo({ ...inAttesa, owner_id: ALTRO, current_due_date: '2026-07-01' })],
      [],
      OGGI,
      IO,
      true,
    );
    expect(impegni).toEqual([{ tipo: 'scaduti', quanti: 1 }]);
  });

  it('approvazioni prima delle scadenze future', () => {
    const impegni = impegniDelGiorno(
      [
        rinnovo({ current_due_date: '2026-08-20' }),
        rinnovo({ ...inAttesa, owner_id: ALTRO }),
      ],
      [],
      OGGI,
      IO,
      true,
    );
    expect(impegni.map((i) => i.tipo)).toEqual(['da_approvare', 'in_scadenza']);
  });
});

describe('prossimoAppuntamento', () => {
  it('senza prenotazioni, niente', () => {
    expect(prossimoAppuntamento([], OGGI, IO)).toBeNull();
  });

  it('prende il primo futuro, non il primo dell’elenco', () => {
    const p = prossimoAppuntamento(
      [
        prenotazione({ inizio: '2026-09-01T09:00:00Z' }),
        prenotazione({ inizio: '2026-08-18T09:00:00Z' }),
      ],
      OGGI,
      IO,
    );
    expect(p).toEqual({ tipo: 'appuntamento', quando: '2026-08-18T09:00:00Z', conChi: 'Marco' });
  });

  it('ignora quelli passati', () => {
    const p = prossimoAppuntamento([prenotazione({ inizio: '2026-08-01T09:00:00Z' })], OGGI, IO);
    expect(p).toBeNull();
  });

  it('ignora quelli annullati', () => {
    const p = prossimoAppuntamento([prenotazione({ stato: 'annullata' })], OGGI, IO);
    expect(p).toBeNull();
  });

  it('mostra l’altra persona quando sono io a ospitare', () => {
    const p = prossimoAppuntamento(
      [prenotazione({ hostId: IO, guestId: ALTRO, guestNome: 'Anna' })],
      OGGI,
      IO,
    );
    expect(p).toMatchObject({ conChi: 'Anna' });
  });

  it('una data illeggibile non fa saltare tutto', () => {
    const p = prossimoAppuntamento(
      [prenotazione({ inizio: 'boh' }), prenotazione({ inizio: '2026-08-18T09:00:00Z' })],
      OGGI,
      IO,
    );
    expect(p).toMatchObject({ quando: '2026-08-18T09:00:00Z' });
  });

  it('un appuntamento in corso adesso resta il prossimo', () => {
    // Comincia esattamente ora: annunciarlo è ancora utile.
    const p = prossimoAppuntamento([prenotazione({ inizio: OGGI.toISOString() })], OGGI, IO);
    expect(p).not.toBeNull();
  });
});

describe('impegniDelGiorno — insieme', () => {
  it('l’appuntamento sta in fondo, dopo le scadenze', () => {
    const impegni = impegniDelGiorno(
      [rinnovo({ current_due_date: '2026-08-01' })],
      [prenotazione({})],
      OGGI,
      IO,
      false,
    );
    expect(impegni.map((i) => i.tipo)).toEqual(['scaduti', 'appuntamento']);
  });

  it('solo un appuntamento è comunque qualcosa da mostrare', () => {
    const impegni = impegniDelGiorno([], [prenotazione({})], OGGI, IO, false);
    expect(tuttoInOrdine(impegni)).toBe(false);
    expect(impegni).toHaveLength(1);
  });
});
