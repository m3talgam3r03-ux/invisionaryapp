/**
 * Test dei percorsi Storage (src/lib/storage.ts).
 *
 * Quello che presidiano: cancellare un post deve cancellare anche la foto.
 * Il bucket della Community è pubblico, quindi una foto rimasta indietro
 * resta raggiungibile da chi ne conosce l'indirizzo — dopo che chi l'ha
 * pubblicata ha chiesto di toglierla.
 */
import { describe, expect, it } from 'vitest';

import { percorsoDaUrlPubblico } from '@/lib/storage';

const BASE = 'https://abcdef.supabase.co/storage/v1/object/public/feedback/';

describe('percorsoDaUrlPubblico', () => {
  it('estrae il percorso da un URL vero', () => {
    expect(percorsoDaUrlPubblico(`${BASE}utente-1/1723000000000.jpg`, 'feedback')).toBe(
      'utente-1/1723000000000.jpg',
    );
  });

  it('tiene le sottocartelle', () => {
    expect(percorsoDaUrlPubblico(`${BASE}a/b/c/foto.png`, 'feedback')).toBe('a/b/c/foto.png');
  });

  it('butta via la query string', () => {
    expect(percorsoDaUrlPubblico(`${BASE}u/1.jpg?t=12345`, 'feedback')).toBe('u/1.jpg');
    expect(percorsoDaUrlPubblico(`${BASE}u/1.jpg#x`, 'feedback')).toBe('u/1.jpg');
  });

  it('decodifica i caratteri speciali', () => {
    // Senza decodifica si chiederebbe di cancellare «foto%20mia.jpg», che
    // nel bucket non esiste: il file si chiama «foto mia.jpg».
    expect(percorsoDaUrlPubblico(`${BASE}u/foto%20mia.jpg`, 'feedback')).toBe('u/foto mia.jpg');
  });

  it('un altro bucket non è affar suo', () => {
    // Meglio non cancellare niente che cancellare il file sbagliato.
    const altro = 'https://x.supabase.co/storage/v1/object/public/documenti/u/1.pdf';
    expect(percorsoDaUrlPubblico(altro, 'feedback')).toBeNull();
  });

  it('restituisce null su tutto ciò che non è un URL di questo bucket', () => {
    for (const u of [null, undefined, '', 'https://esempio.it/foto.jpg', 'non-un-url']) {
      expect(percorsoDaUrlPubblico(u, 'feedback')).toBeNull();
    }
  });

  it('un URL che finisce col bucket e basta non ha percorso', () => {
    expect(percorsoDaUrlPubblico(BASE, 'feedback')).toBeNull();
  });

  it('senza bucket non prova a indovinare', () => {
    expect(percorsoDaUrlPubblico(`${BASE}u/1.jpg`, '')).toBeNull();
  });

  it('una codifica rotta non fa saltare la cancellazione', () => {
    // `%zz` non è una sequenza valida: decodeURIComponent lancerebbe.
    expect(percorsoDaUrlPubblico(`${BASE}u/rotto%zz.jpg`, 'feedback')).toBe('u/rotto%zz.jpg');
  });
});
