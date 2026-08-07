/**
 * Test della mappa degli iscritti (src/lib/mappa.ts).
 *
 * Due cose da presidiare, e nessuna delle due è grafica.
 *
 * 1. La differenza fra «qui non c'è nessuno» e «qui c'è qualcuno ma non posso
 *    dirti quanti». Confonderle significherebbe o mentire, o pubblicare che in
 *    Molise c'è una persona sola — che non è una statistica, è una persona.
 * 2. Che i nomi del pacchetto arrivino tutti a un nome ufficiale italiano. Il
 *    pacchetto dice «Lombardy» e il database vuole «Lombardia»: se una
 *    traduzione mancasse, quella regione resterebbe muta sulla mappa senza che
 *    nulla lo segnali.
 */
import { describe, expect, it } from 'vitest';

import {
  NOMI_REGIONI,
  REGIONI,
  SCALA_MAX,
  SCALA_MIN,
  VIEW_BOX,
  VISTA_INIZIALE,
  contieni,
  costruisciMappa,
  livelloColore,
  regionePiuAffollata,
  regioneValida,
  testoRiepilogo,
  trascina,
  viewBoxDiVista,
  zooma,
  type ConteggioRegione,
} from '@/lib/mappa';

/** I 20 nomi che il CHECK del database accetta. Copiati dalla migrazione 0025. */
const UFFICIALI = [
  'Abruzzo',
  'Basilicata',
  'Calabria',
  'Campania',
  'Emilia-Romagna',
  'Friuli-Venezia Giulia',
  'Lazio',
  'Liguria',
  'Lombardia',
  'Marche',
  'Molise',
  'Piemonte',
  'Puglia',
  'Sardegna',
  'Sicilia',
  'Toscana',
  'Trentino-Alto Adige',
  'Umbria',
  "Valle d'Aosta",
  'Veneto',
];

describe('le venti regioni, coi contorni veri', () => {
  it('ci sono tutte e i nomi coincidono con quelli del database', () => {
    // Se il pacchetto rinominasse una regione, questo test cade prima che la
    // mappa si ritrovi un buco muto.
    expect(REGIONI).toHaveLength(20);
    expect([...NOMI_REGIONI].sort()).toEqual([...UFFICIALI].sort());
  });

  it('ogni regione ha un contorno vero, non un segnaposto', () => {
    for (const r of REGIONI) {
      expect(r.contorno.length, r.nome).toBeGreaterThan(100);
      expect(r.contorno.startsWith('M') || r.contorno.startsWith('m'), r.nome).toBe(true);
    }
  });

  it('nessun identificativo ripetuto', () => {
    expect(new Set(REGIONI.map((r) => r.id)).size).toBe(20);
  });

  it('il riquadro di disegno è quello del pacchetto', () => {
    const parti = VIEW_BOX.split(/\s+/).map(Number);
    expect(parti).toHaveLength(4);
    expect(parti[2], 'larghezza').toBeGreaterThan(0);
    expect(parti[3], 'altezza').toBeGreaterThan(parti[2]); // l'Italia è più alta che larga
  });

  it('regioneValida rispecchia l’elenco chiuso del database', () => {
    expect(regioneValida('Lombardia')).toBe(true);
    expect(regioneValida("Valle d'Aosta")).toBe(true);
    expect(regioneValida('Lombardy'), 'il nome inglese non vale').toBe(false);
    expect(regioneValida('lombardia'), 'il confronto è esatto').toBe(false);
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

  it('la mappa ha sempre venti regioni, anche senza dati', () => {
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

describe('zoom e trascinamento', () => {
  it('lo zoom tiene fermo il punto che si sta guardando', () => {
    // Senza questo si zooma sulla Sicilia e ci si ritrova sull'Emilia.
    const dopo = zooma(VISTA_INIZIALE, 2, 0.5, 0.9);
    expect(dopo.scala).toBe(2);
    // Puntando in basso, la finestra si sposta verso il basso.
    expect(dopo.y).toBeGreaterThan(0);
    // Puntando al centro in orizzontale, resta centrata.
    expect(dopo.x).toBeCloseTo(0.25, 6);
  });

  it('non si ingrandisce oltre il limite né si rimpicciolisce sotto', () => {
    let v = VISTA_INIZIALE;
    for (let i = 0; i < 20; i++) v = zooma(v, 2);
    expect(v.scala).toBe(SCALA_MAX);
    for (let i = 0; i < 20; i++) v = zooma(v, 0.5);
    expect(v.scala).toBe(SCALA_MIN);
  });

  it('a scala 1 non ci si può trascinare via la mappa', () => {
    // Trascinare fuori lascerebbe un rettangolo vuoto, e da lì nessuno capisce
    // come tornare indietro.
    const v = trascina(VISTA_INIZIALE, 0.5, 0.5);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('trascinando da ingranditi ci si muove, ma dentro i bordi', () => {
    const ingrandita = zooma(VISTA_INIZIALE, 2);
    const spostata = trascina(ingrandita, -0.3, -0.3);
    expect(spostata.x).toBeGreaterThan(ingrandita.x);
    expect(spostata.x).toBeLessThanOrEqual(0.5);

    const oltre = trascina(ingrandita, -10, -10);
    expect(oltre.x, 'si ferma al bordo').toBe(0.5);
    expect(oltre.y).toBe(0.5);
  });

  it('contieni riporta dentro qualunque vista sballata', () => {
    expect(contieni({ x: -5, y: 9, scala: 2 })).toEqual({ x: 0, y: 0.5, scala: 2 });
  });

  it('il viewBox mostra tutta l’Italia a scala 1', () => {
    expect(viewBoxDiVista(VISTA_INIZIALE)).toBe(VIEW_BOX.trim());
  });

  it('raddoppiando la scala si vede metà larghezza e metà altezza', () => {
    const [, , l, a] = VIEW_BOX.split(/\s+/).map(Number);
    const vb = viewBoxDiVista({ x: 0, y: 0, scala: 2 }).split(/\s+/).map(Number);
    expect(vb[2]).toBeCloseTo(l / 2, 6);
    expect(vb[3]).toBeCloseTo(a / 2, 6);
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
    expect(
      testoRiepilogo({
        totaleVisibile: 40,
        regioniVisibili: 5,
        regioniNascoste: 0,
        senzaRegione: 0,
      }),
    ).toBe('40 iscritti in 5 regioni.');
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
