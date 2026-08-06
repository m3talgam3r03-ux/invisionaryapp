/**
 * Test dei punti premio (src/lib/premi.ts).
 *
 * Il punto che questi test presidiano è uno solo: i punti premio sono una
 * VALUTA, non un livello. Si spendono, il saldo scende, e il registro deve
 * sempre spiegare il saldo. Che due riscatti simultanei non possano entrambi
 * passare lo garantisce il CHECK nel database, non questo modulo.
 */
import { describe, expect, it } from 'vitest';

import {
  avanzamento,
  impedimento,
  prossimoObiettivo,
  puntiMancanti,
  saldoDalRegistro,
  saldoIncoerente,
  segno,
  type Premio,
  type VocePunti,
} from '@/lib/premi';

function premio(extra: Partial<Premio> = {}): Premio {
  return {
    id: 'p1',
    nome: 'Felpa Invisionary',
    descrizione: null,
    costoPunti: 500,
    disponibili: null,
    attivo: true,
    ...extra,
  };
}

function voce(delta: number, origine: VocePunti['origine'] = 'maturazione'): VocePunti {
  return { id: Math.random().toString(36), delta, origine, motivo: null, createdAt: '2026-08-01' };
}

describe('si può riscattare?', () => {
  it('sì, quando i punti bastano e il premio c’è', () => {
    expect(impedimento(premio(), 500)).toBeNull();
    expect(impedimento(premio(), 900)).toBeNull();
  });

  it('un premio esaurito resta esaurito anche per chi ha punti da vendere', () => {
    // Dirgli «ti mancano punti» sarebbe falso, e l'ordine dei controlli è
    // l'unica cosa che lo evita.
    expect(impedimento(premio({ disponibili: 0 }), 100_000)).toBe('esaurito');
  });

  it('senza limite di pezzi non è mai esaurito', () => {
    expect(impedimento(premio({ disponibili: null }), 500)).toBeNull();
    expect(impedimento(premio({ disponibili: 1 }), 500)).toBeNull();
  });

  it('un premio spento non si riscatta, punti o no', () => {
    expect(impedimento(premio({ attivo: false }), 100_000)).toBe('non_attivo');
  });

  it('un punto in meno basta a impedirlo', () => {
    expect(impedimento(premio(), 499)).toBe('punti_insufficienti');
    expect(puntiMancanti(premio(), 499)).toBe(1);
    expect(puntiMancanti(premio(), 500)).toBe(0);
    expect(puntiMancanti(premio(), 700)).toBe(0);
  });
});

describe('avanzamento verso un premio', () => {
  it('va da 0 a 1 e non esce mai dai bordi', () => {
    expect(avanzamento(premio(), 0)).toBe(0);
    expect(avanzamento(premio(), 250)).toBeCloseTo(0.5, 6);
    expect(avanzamento(premio(), 500)).toBe(1);
    expect(avanzamento(premio(), 5_000), 'non supera 1').toBe(1);
    expect(avanzamento(premio(), -10), 'né scende sotto 0').toBe(0);
  });

  it('un premio da zero punti è già raggiunto', () => {
    expect(avanzamento(premio({ costoPunti: 0 }), 0)).toBe(1);
  });
});

describe('il registro spiega il saldo', () => {
  it('la somma delle voci è il saldo', () => {
    const voci = [voce(100), voce(250), voce(-300, 'riscatto'), voce(300, 'rimborso')];
    expect(saldoDalRegistro(voci)).toBe(350);
  });

  it('un riscatto rifiutato riporta il saldo dov’era', () => {
    // Il rimborso è una riga NUOVA, non la cancellazione di quella vecchia:
    // un registro che si può riscrivere non spiega più niente.
    const prima = [voce(500)];
    const dopo = [...prima, voce(-500, 'riscatto'), voce(500, 'rimborso')];
    expect(saldoDalRegistro(dopo)).toBe(saldoDalRegistro(prima));
    expect(dopo).toHaveLength(3);
  });

  it('registro vuoto, saldo zero', () => {
    expect(saldoDalRegistro([])).toBe(0);
  });

  it('segnala quando saldo e registro divergono', () => {
    const voci = [voce(100), voce(-40, 'riscatto')];
    expect(saldoIncoerente(60, voci)).toBe(false);
    expect(saldoIncoerente(75, voci)).toBe(true);
  });

  it('i decimali non contano come divergenza', () => {
    const voci = [voce(0.1), voce(0.2)];
    expect(saldoIncoerente(0.3, voci), '0,1 + 0,2 non fa esattamente 0,3').toBe(false);
  });
});

describe('il prossimo obiettivo', () => {
  const catalogo = [
    premio({ id: 'a', costoPunti: 200 }),
    premio({ id: 'b', costoPunti: 500 }),
    premio({ id: 'c', costoPunti: 1_000 }),
  ];

  it('è il primo che non ci si può ancora permettere, non il più costoso', () => {
    expect(prossimoObiettivo(catalogo, 0)?.id).toBe('a');
    expect(prossimoObiettivo(catalogo, 200)?.id).toBe('b');
    expect(prossimoObiettivo(catalogo, 600)?.id).toBe('c');
  });

  it('salta gli esauriti e gli spenti: non sono obiettivi', () => {
    const con = [
      premio({ id: 'a', costoPunti: 200, disponibili: 0 }),
      premio({ id: 'b', costoPunti: 500, attivo: false }),
      premio({ id: 'c', costoPunti: 1_000 }),
    ];
    expect(prossimoObiettivo(con, 0)?.id).toBe('c');
  });

  it('quando tutto è alla portata non c’è nessun obiettivo', () => {
    expect(prossimoObiettivo(catalogo, 5_000)).toBeNull();
    expect(prossimoObiettivo([], 0)).toBeNull();
  });
});

describe('segno', () => {
  it('usa il meno tipografico, non il trattino', () => {
    expect(segno(120)).toBe('+120');
    expect(segno(-250)).toBe('−250');
    expect(segno(0)).toBe('+0');
  });
});
