/**
 * Test del podio (src/lib/podio.ts).
 *
 * Il podio lo vede tutta la rete: è la schermata più esposta dell'app. Questi
 * test presidiano due cose — che il primo stia al centro, e che il mese
 * mostrato sia quello chiuso e non quello in corso.
 */
import { describe, expect, it } from 'vitest';

import {
  etichettaMese,
  mesePrecedente,
  ordinePodio,
  posizioniPremiate,
  puntiPerPosizione,
  type VocePodio,
} from '@/lib/podio';

function voce(posizione: number, nome: string): VocePodio {
  return { posizione, userId: `u${posizione}`, nome, winRate: 70 - posizione, operazioni: 40 };
}

describe('disposizione delle colonne', () => {
  it('è 2 · 1 · 3: il primo sta al centro', () => {
    // Disporli 1-2-3 da sinistra farebbe sembrare il vincitore un terzo.
    const d = ordinePodio([voce(1, 'Anna'), voce(2, 'Bruno'), voce(3, 'Carla')]);
    expect(d.map((v) => v.posizione)).toEqual([2, 1, 3]);
    expect(d.map((v) => v.nome)).toEqual(['Bruno', 'Anna', 'Carla']);
  });

  it('regge un podio incompleto senza buchi', () => {
    expect(ordinePodio([voce(1, 'Anna')]).map((v) => v.posizione)).toEqual([1]);
    expect(ordinePodio([voce(1, 'Anna'), voce(2, 'Bruno')]).map((v) => v.posizione)).toEqual([2, 1]);
    expect(ordinePodio([])).toEqual([]);
  });

  it('ignora posizioni oltre la terza: sul podio ci stanno in tre', () => {
    const d = ordinePodio([voce(1, 'Anna'), voce(4, 'Dario'), voce(2, 'Bruno')]);
    expect(d.map((v) => v.posizione)).toEqual([2, 1]);
  });

  it('l’ordine di arrivo dei dati non conta', () => {
    const d = ordinePodio([voce(3, 'Carla'), voce(1, 'Anna'), voce(2, 'Bruno')]);
    expect(d.map((v) => v.posizione)).toEqual([2, 1, 3]);
  });
});

describe('quale mese si mostra', () => {
  it('quello appena chiuso, non quello in corso', () => {
    // Mostrare il mese corrente farebbe vedere una classifica che cambia sotto
    // gli occhi: nessuno saprebbe se il primo è primo davvero o solo per adesso.
    expect(mesePrecedente(new Date(Date.UTC(2026, 7, 6)))).toBe('2026-07-01');
    expect(mesePrecedente(new Date(Date.UTC(2026, 7, 31)))).toBe('2026-07-01');
  });

  it('a gennaio torna a dicembre dell’anno prima', () => {
    expect(mesePrecedente(new Date(Date.UTC(2026, 0, 15)))).toBe('2025-12-01');
  });

  it('il primo del mese mostra comunque il mese chiuso', () => {
    expect(mesePrecedente(new Date(Date.UTC(2026, 2, 1)))).toBe('2026-02-01');
  });
});

describe('etichetta del mese', () => {
  it('in italiano, per esteso', () => {
    expect(etichettaMese('2026-07-01')).toBe('luglio 2026');
    expect(etichettaMese('2025-12-01')).toBe('dicembre 2025');
    expect(etichettaMese('2026-01-01')).toBe('gennaio 2026');
  });

  it('quello che non è una data resta com’è, invece di diventare «undefined»', () => {
    expect(etichettaMese('')).toBe('');
    expect(etichettaMese('boh')).toBe('boh');
    expect(etichettaMese('2026-13-01')).toBe('2026-13-01');
  });
});

describe('punti per posizione', () => {
  const regole = new Map([
    [1, 500],
    [2, 300],
    [3, 200],
    [4, 120],
    [5, 100],
  ]);

  it('legge il valore dalle regole del database', () => {
    expect(puntiPerPosizione(regole, 1)).toBe(500);
    expect(puntiPerPosizione(regole, 5)).toBe(100);
  });

  it('fuori dalle posizioni premiate vale zero, e va detto', () => {
    // Lasciar credere che partecipare basti sarebbe peggio di dire di no.
    expect(puntiPerPosizione(regole, 6)).toBe(0);
    expect(puntiPerPosizione(regole, 99)).toBe(0);
    expect(puntiPerPosizione(new Map(), 1)).toBe(0);
  });

  it('quante posizioni sono premiate, senza cablare il numero', () => {
    expect(posizioniPremiate(regole)).toBe(5);
    expect(posizioniPremiate(new Map([[1, 500], [2, 300], [10, 60]]))).toBe(10);
    expect(posizioniPremiate(new Map())).toBe(0);
  });
});
