/**
 * Test della mappa degli iscritti (src/lib/mappa.ts).
 *
 * Il punto che questi test presidiano non è la grafica: è la differenza fra
 * «qui non c'è nessuno» e «qui c'è qualcuno ma non posso dirti quanti».
 * Confonderle significherebbe o mentire, o pubblicare che in Molise c'è una
 * persona sola — che non è una statistica, è una persona.
 */
import { describe, expect, it } from 'vitest';

import {
  COLONNE,
  REGIONI,
  RIGHE,
  costruisciMappa,
  livelloColore,
  regionePiuAffollata,
  regioneValida,
  testoRiepilogo,
  type ConteggioRegione,
} from '@/lib/mappa';

describe('le venti regioni', () => {
  it('ci sono tutte, una volta sola', () => {
    expect(REGIONI).toHaveLength(20);
    expect(new Set(REGIONI.map((r) => r.nome)).size).toBe(20);
    expect(new Set(REGIONI.map((r) => r.sigla)).size, 'sigle distinte').toBe(20);
  });

  it('nessuna casella si sovrappone a un’altra', () => {
    const celle = REGIONI.map((r) => `${r.colonna},${r.riga}`);
    expect(new Set(celle).size, 'due regioni nella stessa casella').toBe(20);
  });

  it('stanno tutte dentro la griglia', () => {
    for (const r of REGIONI) {
      expect(r.colonna, r.nome).toBeGreaterThanOrEqual(0);
      expect(r.colonna, r.nome).toBeLessThanOrEqual(COLONNE);
      expect(r.riga, r.nome).toBeGreaterThanOrEqual(0);
      expect(r.riga, r.nome).toBeLessThan(RIGHE);
    }
  });

  it('la disposizione rispetta la geografia dove conta', () => {
    const per = new Map(REGIONI.map((r) => [r.nome, r]));
    const riga = (n: string) => per.get(n)!.riga;
    const col = (n: string) => per.get(n)!.colonna;

    // Nord sopra, sud sotto.
    expect(riga('Lombardia')).toBeLessThan(riga('Lazio'));
    expect(riga('Lazio')).toBeLessThan(riga('Calabria'));
    expect(riga('Calabria')).toBeLessThan(riga('Sicilia'));
    // Ovest a sinistra, est a destra.
    expect(col('Piemonte')).toBeLessThan(col('Veneto'));
    expect(col('Lazio')).toBeLessThan(col('Puglia'));
    // Le isole a ovest.
    expect(col('Sardegna')).toBe(0);
  });

  it('regioneValida rispecchia l’elenco chiuso del database', () => {
    expect(regioneValida('Lombardia')).toBe(true);
    expect(regioneValida("Valle d'Aosta")).toBe(true);
    expect(regioneValida('lombardia'), 'il confronto è esatto').toBe(false);
    expect(regioneValida('Padania')).toBe(false);
    expect(regioneValida('')).toBe(false);
  });
});

describe('IL CASO CHE CONTA: nascosto non è vuoto', () => {
  it('una regione soppressa si vede, ma senza numero', () => {
    // `null` arriva dal database quando gli iscritti sono sotto la soglia.
    // Mostrarla vuota direbbe «lì non c'è nessuno», che è falso.
    const mappa = costruisciMappa([
      { regione: 'Lombardia', iscritti: 40 },
      { regione: 'Molise', iscritti: null },
    ]);
    const molise = mappa.find((c) => c.nome === 'Molise')!;
    expect(molise.nascosto).toBe(true);
    expect(molise.iscritti).toBeNull();
    expect(molise.livello, 'colorata: si vede che c’è qualcuno').toBeGreaterThan(0);
  });

  it('una regione senza nessuno è vuota e non nascosta', () => {
    const mappa = costruisciMappa([{ regione: 'Lombardia', iscritti: 40 }]);
    const sicilia = mappa.find((c) => c.nome === 'Sicilia')!;
    expect(sicilia.iscritti).toBe(0);
    expect(sicilia.nascosto).toBe(false);
    expect(sicilia.livello).toBe(0);
  });

  it('la mappa ha sempre venti caselle, anche senza dati', () => {
    expect(costruisciMappa([])).toHaveLength(20);
    expect(costruisciMappa([]).every((c) => c.iscritti === 0)).toBe(true);
  });
});

describe('scala di colore', () => {
  it('si adatta al massimo osservato, non a soglie fisse', () => {
    // Una rete da 50 persone e una da 5.000 devono dare entrambe una mappa
    // leggibile: con soglie fisse la prima sarebbe tutta dello stesso colore.
    const piccola = costruisciMappa([
      { regione: 'Lombardia', iscritti: 8 },
      { regione: 'Lazio', iscritti: 4 },
      { regione: 'Sicilia', iscritti: 1 },
    ]);
    const grande = costruisciMappa([
      { regione: 'Lombardia', iscritti: 800 },
      { regione: 'Lazio', iscritti: 400 },
      { regione: 'Sicilia', iscritti: 100 },
    ]);
    const livelli = (m: ReturnType<typeof costruisciMappa>) =>
      ['Lombardia', 'Lazio', 'Sicilia'].map((n) => m.find((c) => c.nome === n)!.livello);
    expect(livelli(piccola)).toEqual(livelli(grande));
  });

  it('va da 0 a 4 e non esce dai bordi', () => {
    expect(livelloColore(0, 100)).toBe(0);
    expect(livelloColore(10, 100)).toBe(1);
    expect(livelloColore(40, 100)).toBe(2);
    expect(livelloColore(60, 100)).toBe(3);
    expect(livelloColore(100, 100)).toBe(4);
  });

  it('regge i casi limite senza dividere per zero', () => {
    expect(livelloColore(0, 0)).toBe(0);
    expect(livelloColore(5, 0)).toBe(0);
    expect(livelloColore(null, 0)).toBe(1);
    expect(livelloColore(-3, 100)).toBe(0);
  });
});

describe('la riga sotto la mappa', () => {
  it('dice sempre quante regioni non sono mostrate', () => {
    // Una mappa che tace su ciò che non mostra fa credere che il vuoto sia
    // vuoto davvero.
    const testo = testoRiepilogo({
      totaleVisibile: 138,
      regioniVisibili: 12,
      regioniNascoste: 3,
      senzaRegione: 7,
    });
    expect(testo).toContain('138 iscritti in 12 regioni');
    expect(testo).toContain('3 regioni hanno');
    expect(testo).toContain('7 non ha indicato la regione');
  });

  it('non parla di regioni nascoste quando non ce ne sono', () => {
    const testo = testoRiepilogo({
      totaleVisibile: 40,
      regioniVisibili: 5,
      regioniNascoste: 0,
      senzaRegione: 0,
    });
    expect(testo).toBe('40 iscritti in 5 regioni.');
  });

  it('usa il singolare quando serve', () => {
    const testo = testoRiepilogo({
      totaleVisibile: 1,
      regioniVisibili: 1,
      regioniNascoste: 1,
      senzaRegione: 0,
    });
    expect(testo).toContain('1 iscritto in 1 regione');
    expect(testo).toContain('1 regione ha');
  });
});

describe('la regione più affollata', () => {
  const conteggi: ConteggioRegione[] = [
    { regione: 'Lombardia', iscritti: 40 },
    { regione: 'Lazio', iscritti: 55 },
    { regione: 'Molise', iscritti: null },
  ];

  it('è la prima fra quelle che si possono nominare', () => {
    expect(regionePiuAffollata(conteggi)?.regione).toBe('Lazio');
  });

  it('non nomina mai una regione soppressa', () => {
    expect(regionePiuAffollata([{ regione: 'Molise', iscritti: null }])).toBeNull();
  });

  it('senza dati non inventa niente', () => {
    expect(regionePiuAffollata([])).toBeNull();
    expect(regionePiuAffollata([{ regione: 'Lazio', iscritti: 0 }])).toBeNull();
  });
});
