/**
 * Test delle regole di rinnovo (src/lib/renewal-rules.ts).
 *
 * Il caso che conta davvero è il primo blocco: sommare sulla scadenza
 * precedente invece che su oggi. È l'errore che fa perdere giorni a ogni
 * approvazione in ritardo, e lo scivolamento si accumula senza che nessuno se
 * ne accorga.
 */
import { describe, expect, it } from 'vitest';

import {
  giorniDiRitardo,
  giorniTra,
  opzioniRinnovo,
  periodiDiRitardo,
  prossimaScadenza,
  recuperaScadenza,
  serveConfermaEsplicita,
  sommaGiorni,
} from '@/lib/renewal-rules';

describe('la scadenza avanza dalla scadenza, non da oggi', () => {
  it('due rinnovi di fila fanno esattamente 60 giorni', () => {
    const primo = prossimaScadenza('2026-01-31', 30);
    const secondo = prossimaScadenza(primo, 30);
    expect(primo).toBe('2026-03-02');
    expect(secondo).toBe('2026-04-01');
    expect(giorniTra('2026-01-31', secondo)).toBe(60); // né 30, né 61
  });

  it('approvare in ritardo non fa perdere giorni', () => {
    // Scadeva il 1° marzo, approvato il 20: la nuova scadenza resta agganciata
    // al 1° marzo, non al 20.
    expect(prossimaScadenza('2026-03-01', 30)).toBe('2026-03-31');
  });

  it('funziona con durate diverse da 30', () => {
    expect(prossimaScadenza('2026-01-01', 365)).toBe('2027-01-01');
    expect(prossimaScadenza('2026-01-01', 7)).toBe('2026-01-08');
  });

  it('attraversa fine mese e anno bisestile senza sbagliare', () => {
    expect(sommaGiorni('2026-12-20', 30)).toBe('2027-01-19');
    expect(sommaGiorni('2028-02-28', 1)).toBe('2028-02-29'); // 2028 è bisestile
    expect(sommaGiorni('2027-02-28', 1)).toBe('2027-03-01');
  });
});

describe('ritardo', () => {
  const oggi = '2026-06-01';

  it('non è in ritardo se la scadenza è futura', () => {
    expect(giorniDiRitardo('2026-07-01', oggi)).toBe(0);
    expect(periodiDiRitardo('2026-07-01', 30, oggi)).toBe(0);
  });

  it('conta i giorni e i periodi interi passati', () => {
    expect(giorniDiRitardo('2026-05-02', oggi)).toBe(30);
    expect(periodiDiRitardo('2026-05-02', 30, oggi)).toBe(1);
    expect(periodiDiRitardo('2026-03-03', 30, oggi)).toBe(3);
  });

  it('il giorno stesso della scadenza non è ritardo', () => {
    expect(giorniDiRitardo(oggi, oggi)).toBe(0);
  });
});

describe('conferma esplicita oltre i due periodi', () => {
  const oggi = '2026-06-01';

  it('non serve conferma entro due periodi', () => {
    expect(serveConfermaEsplicita('2026-05-15', 30, oggi)).toBe(false); // 0 periodi
    expect(serveConfermaEsplicita('2026-04-15', 30, oggi)).toBe(false); // 1 periodo
    expect(serveConfermaEsplicita('2026-03-20', 30, oggi)).toBe(false); // 2 periodi
  });

  it('serve conferma oltre due periodi', () => {
    expect(serveConfermaEsplicita('2026-02-20', 30, oggi)).toBe(true); // 3 periodi
  });
});

describe('recupero della scadenza arretrata', () => {
  const oggi = '2026-06-01';

  it('avanza finché supera oggi, restando allineato alle scadenze originali', () => {
    // Scadeva il 1° gennaio: 1 feb, 3 mar, 2 apr, 2 mag, 1 giu, 1 lug…
    const recupero = recuperaScadenza('2026-01-01', 30, oggi);
    expect(giorniTra('2026-01-01', recupero) % 30).toBe(0); // multiplo esatto del periodo
    expect(giorniTra(oggi, recupero)).toBeGreaterThan(0); // ed è nel futuro
  });

  it('per una scadenza futura non cambia nulla oltre il periodo singolo', () => {
    expect(recuperaScadenza('2026-07-01', 30, oggi)).toBe('2026-07-31');
  });
});

describe('le due proposte da mettere davanti a chi approva', () => {
  const oggi = '2026-06-01';

  it('per un rinnovo puntuale coincidono: nessuna scelta da fare', () => {
    const o = opzioniRinnovo('2026-06-15', 30, oggi);
    expect(o.coincidono).toBe(true);
    expect(o.serveConferma).toBe(false);
  });

  it('per un rinnovo molto arretrato divergono e chiedono conferma', () => {
    const o = opzioniRinnovo('2026-01-01', 30, oggi);
    expect(o.coincidono).toBe(false);
    expect(o.serveConferma).toBe(true);
    expect(o.periodiDiRitardo).toBeGreaterThan(2);
    // «un solo periodo» lascerebbe la scadenza ancora nel passato: è proprio
    // per questo che va chiesto.
    expect(giorniTra(oggi, o.unPeriodo)).toBeLessThan(0);
    expect(giorniTra(oggi, o.recupero)).toBeGreaterThan(0);
  });
});
