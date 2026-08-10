/**
 * Test delle soglie di layout (src/theme/layout.ts).
 *
 * L'app funzionava già sul web, ma col layout del telefono stirato: su un
 * monitor da 1280 px ogni blocco era largo 1280 px. Questi test presidiano le
 * due decisioni che lo sistemano — dove fermare la colonna del testo e da che
 * larghezza spostare la navigazione di lato — perché sono numeri che è facile
 * cambiare per gusto e difficile ricordare perché stavano lì.
 */
import { describe, expect, it } from 'vitest';

import {
  BARRA_LATERALE,
  CONTENUTO_MAX,
  SOGLIE,
  dimensioneSchermo,
  larghezzaContenuto,
  navigazioneDiLato,
} from '@/theme/layout';

describe('dimensione dello schermo', () => {
  it('un telefono è compatto', () => {
    expect(dimensioneSchermo(360)).toBe('compatta');
    expect(dimensioneSchermo(430)).toBe('compatta');
  });

  it('un tablet o un telefono in orizzontale sono medi', () => {
    expect(dimensioneSchermo(SOGLIE.media)).toBe('media');
    expect(dimensioneSchermo(834)).toBe('media');
  });

  it('un monitor è ampio', () => {
    expect(dimensioneSchermo(SOGLIE.ampia)).toBe('ampia');
    expect(dimensioneSchermo(1280)).toBe('ampia');
    expect(dimensioneSchermo(2560)).toBe('ampia');
  });

  it('le soglie sono inclusive e in ordine', () => {
    expect(SOGLIE.media).toBeLessThan(SOGLIE.ampia);
    expect(dimensioneSchermo(SOGLIE.media - 1)).toBe('compatta');
    expect(dimensioneSchermo(SOGLIE.ampia - 1)).toBe('media');
  });

  it('una larghezza assurda non manda in crisi il layout', () => {
    // Su web la prima misura può arrivare a zero prima del primo disegno.
    // In dubbio si sceglie il layout del telefono, che sta bene ovunque:
    // sbagliare verso «compatta» costa spazio sprecato, sbagliare verso
    // «ampia» costa una barra laterale su uno schermo che non la contiene.
    expect(dimensioneSchermo(0)).toBe('compatta');
    expect(dimensioneSchermo(-100)).toBe('compatta');
    expect(dimensioneSchermo(NaN)).toBe('compatta');
    expect(dimensioneSchermo(Infinity), 'non è una larghezza reale').toBe('compatta');
  });
});

describe('larghezza della colonna di contenuto', () => {
  it('sul telefono non si limita niente: è già la misura giusta', () => {
    expect(larghezzaContenuto(360)).toBeUndefined();
    expect(larghezzaContenuto(430)).toBeUndefined();
  });

  it('da tablet in su si ferma, e sempre alla stessa misura', () => {
    // Il limite è di leggibilità: oltre i ~70 caratteri per riga l'occhio
    // perde il capo della riga successiva.
    expect(larghezzaContenuto(800)).toBe(CONTENUTO_MAX);
    expect(larghezzaContenuto(1280)).toBe(CONTENUTO_MAX);
    expect(larghezzaContenuto(3840), 'un monitor enorme non allarga il testo').toBe(CONTENUTO_MAX);
  });

  it('la colonna non è mai più larga dello schermo che la contiene', () => {
    for (const w of [700, 720, 900, 1000]) {
      const c = larghezzaContenuto(w);
      if (c !== undefined) expect(c).toBeLessThanOrEqual(w);
    }
  });
});

describe('dove sta la navigazione', () => {
  it('in basso sul telefono, di lato sul monitor', () => {
    expect(navigazioneDiLato(390)).toBe(false);
    expect(navigazioneDiLato(834)).toBe(false);
    expect(navigazioneDiLato(1280)).toBe(true);
  });

  it('passa di lato solo quando resta spazio per il contenuto', () => {
    // Una barra laterale sotto quella larghezza mangerebbe il contenuto: il
    // rimanente deve restare almeno quanto un telefono.
    const rimanente = SOGLIE.ampia - BARRA_LATERALE;
    expect(rimanente).toBeGreaterThan(600);
  });
});
