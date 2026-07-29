/**
 * Interpretazione del campo libero `contatto` di un cliente.
 *
 * Nel CRM è un testo libero: può essere un numero, una email, o entrambi.
 * Su mobile un contatto che non si può toccare per chiamare è un contatto
 * inutile, quindi qui si capisce cosa sia e si costruiscono i link.
 *
 * Funzioni pure: sono la parte testabile del CRM.
 */

export type ContactKind = 'phone' | 'email' | 'unknown';

export type ContactActions = {
  kind: ContactKind;
  /** Valore normalizzato: numero senza spazi, email in minuscolo. */
  value: string;
  tel?: string;
  whatsapp?: string;
  mailto?: string;
};

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;

export function parseContact(raw: string | null | undefined): ContactActions {
  const text = (raw ?? '').trim();
  if (!text) return { kind: 'unknown', value: '' };

  const email = EMAIL_RE.exec(text)?.[0];
  if (email) {
    const value = email.toLowerCase();
    return { kind: 'email', value, mailto: `mailto:${value}` };
  }

  // Telefono: si tengono cifre e un eventuale prefisso internazionale.
  const digits = text.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  // Meno di 6 cifre non è un numero componibile: meglio non offrire un'azione
  // che poi fallisce.
  if (digits.replace(/\D/g, '').length >= 6) {
    return {
      kind: 'phone',
      value: digits,
      tel: `tel:${digits}`,
      // WhatsApp vuole il numero senza "+" e senza separatori.
      whatsapp: `https://wa.me/${digits.replace(/\D/g, '')}`,
    };
  }

  return { kind: 'unknown', value: text };
}

/** Ordinamento alfabetico italiano: "Àngelo" accanto ad "Angelo", non in fondo. */
export function byName<T extends { nome: string }>(a: T, b: T): number {
  return a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' });
}

/**
 * Filtro di ricerca: insensibile ad accenti e maiuscole, cerca su tutti i
 * campi visibili invece che sul solo nome — chi cerca "gmail" o il nome di un
 * prodotto si aspetta di trovarlo.
 */
export function matchesQuery(
  client: { nome: string; contatto?: string | null; prodotto?: string | null; note?: string | null },
  query: string,
): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(
    [client.nome, client.contatto, client.prodotto, client.note].filter(Boolean).join(' '),
  );
  // Tutte le parole devono comparire: "mario ross" trova "Mario Rossi".
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
