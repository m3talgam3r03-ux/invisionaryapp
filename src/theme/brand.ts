/**
 * Costanti di brand Invisionary.
 * Identità: occhio (= visione) + i quattro semi delle carte (= mano vincente).
 */

export const BRAND = {
  name: 'Invisionary',
  payoff: 'Winning Dream Team',
} as const;

/**
 * Mappatura semi → pilastri dell'app (usata per icone e navigazione).
 * ♠ Trading · ♥ Network · ♦ Formazione · ♣ Community
 */
export const PILLARS = [
  { key: 'trading', label: 'Trading', suit: '♠', accent: false },
  { key: 'network', label: 'Network', suit: '♥', accent: true },
  { key: 'formazione', label: 'Formazione', suit: '♦', accent: true },
  { key: 'community', label: 'Community', suit: '♣', accent: false },
] as const;

export type PillarKey = (typeof PILLARS)[number]['key'];

/** Sistema di rank a carte (2 → Asso) per classifiche e avanzamento rete. */
export const RANKS = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
] as const;

export type Rank = (typeof RANKS)[number];

/** Ruoli utente della piattaforma. */
export const ROLES = ['admin', 'leader', 'collaborator'] as const;
export type Role = (typeof ROLES)[number];

/** Semi "rossi" (cuori e quadri) — renderizzati con il colore accent. */
export const RED_SUITS: ReadonlySet<string> = new Set(['♥', '♦']);
