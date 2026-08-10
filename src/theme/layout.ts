/**
 * Larghezze e soglie — la stessa app su telefono e su schermo grande.
 *
 * L'app funzionava già sul web, ma con il layout del telefono stirato: su un
 * monitor da 1280 px ogni blocco era largo 1280 px. Non è «meno bello», è
 * illeggibile — una riga di testo lunga mezzo metro non la segue nessuno.
 *
 * Nessun import: sono decisioni pure, e i test le verificano senza React.
 */

/**
 * Le soglie.
 *
 * `MEDIA` è dove un telefono in orizzontale o un tablet stretto cominciano ad
 * avere spazio da sprecare. `AMPIA` è dove conviene spostare la navigazione di
 * lato: sotto quella larghezza una barra laterale mangia il contenuto.
 */
export const SOGLIE = {
  media: 700,
  ampia: 1000,
} as const;

export type Dimensione = 'compatta' | 'media' | 'ampia';

export function dimensioneSchermo(larghezza: number): Dimensione {
  if (!Number.isFinite(larghezza) || larghezza <= 0) return 'compatta';
  if (larghezza >= SOGLIE.ampia) return 'ampia';
  if (larghezza >= SOGLIE.media) return 'media';
  return 'compatta';
}

/**
 * Quanto deve essere larga la colonna del contenuto.
 *
 * Il limite è di leggibilità, non di gusto: oltre i ~70 caratteri per riga
 * l'occhio perde il capo della riga successiva. Con la tipografia dell'app
 * sono circa 720 px.
 *
 * Su schermo compatto non si limita nulla: il telefono è già la misura giusta.
 */
export const CONTENUTO_MAX = 720;

export function larghezzaContenuto(larghezza: number): number | undefined {
  if (dimensioneSchermo(larghezza) === 'compatta') return undefined;
  // Alla soglia esatta lo schermo è più stretto del limite: senza questo, la
  // colonna sarebbe più larga della finestra che la contiene.
  return Math.min(CONTENUTO_MAX, larghezza);
}

/**
 * Da che larghezza la navigazione va di lato.
 *
 * Una barra in basso su un monitor è un pulsante a mezzo metro dagli occhi e
 * a mezzo metro dal mouse: si attraversa tutto lo schermo per cambiare
 * sezione. Di lato sta dove sta lo sguardo.
 */
export function navigazioneDiLato(larghezza: number): boolean {
  return dimensioneSchermo(larghezza) === 'ampia';
}

/** Larghezza della barra laterale, quando c'è. */
export const BARRA_LATERALE = 232;
