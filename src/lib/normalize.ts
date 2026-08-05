/**
 * Normalizzazione di email e telefoni per il confronto.
 *
 * PERCHÉ SERVE: «+39 340 123 4567», «3401234567» e «0039 340 1234567» sono la
 * stessa persona ma tre stringhe diverse. Senza una forma comune la deduplica
 * non trova nulla e la stessa persona entra in lista tre volte.
 *
 * Queste funzioni rispecchiano `normalizza_email()` e `normalizza_telefono()`
 * del database (migrazione 0019). Servono a mostrare i duplicati PRIMA di
 * importare; la verità resta quella del database, che normalizza comunque in
 * scrittura con un trigger.
 *
 * Nessun import: modulo puro, testabile senza React e senza rete.
 */

/** Prefisso di default quando il numero non ne porta uno. */
export const PREFISSO_DEFAULT = '+39';

/** Email confrontabile: minuscola e senza spazi. `null` se non c'è nulla. */
export function normalizzaEmail(valore: string | null | undefined): string | null {
  if (!valore) return null;
  const pulita = valore.trim().toLowerCase();
  return pulita === '' ? null : pulita;
}

/** Riconosce un'email in modo grossolano: basta per distinguerla da un numero. */
export function sembraEmail(valore: string | null | undefined): boolean {
  if (!valore) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore.trim());
}

/**
 * Telefono in formato E.164 (`+39…`).
 *
 * Regole, nell'ordine:
 *   · via tutto ciò che non è cifra o «+» (spazi, punti, trattini, parentesi);
 *   · «00» iniziale è la forma internazionale scritta all'europea → «+»;
 *   · se inizia già con «+», si accetta com'è se la lunghezza è plausibile;
 *   · altrimenti è un numero nazionale e si antepone il prefisso.
 *
 * ⚠️ Lo zero iniziale NON si toglie per l'Italia. In molti paesi lo zero è un
 * prefisso interurbano da scartare nella forma internazionale, ma in Italia fa
 * parte del numero: un fisso di Milano è +39 02 1234567, non +39 2 1234567.
 * Toglierlo qui avrebbe reso irraggiungibile ogni numero fisso, e in silenzio.
 *
 * Restituisce `null` quando il valore non è un numero plausibile: meglio non
 * confrontare che confrontare una cosa inventata.
 */
export function normalizzaTelefono(
  valore: string | null | undefined,
  prefisso: string = PREFISSO_DEFAULT,
): string | null {
  if (!valore) return null;

  let pulito = valore.replace(/[^0-9+]/g, '');
  if (pulito === '') return null;

  if (pulito.startsWith('00')) {
    pulito = `+${pulito.slice(2)}`;
  }

  if (pulito.startsWith('+')) {
    const cifre = pulito.length - 1;
    return cifre >= 7 && cifre <= 15 ? pulito : null;
  }

  // Un «+» in mezzo al numero non ha senso: il valore non è affidabile.
  if (pulito.includes('+')) return null;

  // Fuori dall'Italia lo zero iniziale è un prefisso interurbano e va tolto.
  const nazionale = prefisso === '+39' ? pulito : pulito.replace(/^0+/, '');
  if (nazionale.length < 6 || nazionale.length > 13) return null;
  return `${prefisso}${nazionale}`;
}

/**
 * Divide un campo libero in email e telefono.
 * Serve per i contatti scritti in un campo unico, dove può esserci l'una,
 * l'altro, o entrambi separati da virgole o spazi.
 */
export function separaContatto(valore: string | null | undefined): {
  email: string | null;
  telefono: string | null;
} {
  if (!valore) return { email: null, telefono: null };

  // Prima si estrae l'email, poi TUTTO il resto è il telefono.
  // Spezzare la stringa sugli spazi non funziona: «340 1234567» diventerebbe
  // due pezzi, e il secondo da solo sembrerebbe un numero valido ma sbagliato.
  const trovata = valore.match(/[^\s,;|]+@[^\s,;|]+\.[^\s,;|]+/);
  const email = trovata ? normalizzaEmail(trovata[0]) : null;
  const resto = trovata ? valore.replace(trovata[0], ' ') : valore;

  return { email, telefono: normalizzaTelefono(resto) };
}

/**
 * Chiave con cui due righe si considerano la stessa persona.
 * L'email ha la precedenza sul telefono: è più raramente condivisa fra
 * persone diverse (un numero di casa può essere di due familiari).
 */
export function chiaveDeduplica(riga: {
  email?: string | null;
  telefono?: string | null;
}): string | null {
  const email = normalizzaEmail(riga.email);
  if (email) return `email:${email}`;
  const telefono = normalizzaTelefono(riga.telefono);
  if (telefono) return `tel:${telefono}`;
  return null;
}

/**
 * Toglie i doppioni interni a una lista, tenendo la prima occorrenza.
 * Le righe senza email né telefono non sono deduplicabili e passano tutte:
 * scartarle significherebbe perdere contatti solo perché incompleti.
 */
export function deduplica<T extends { email?: string | null; telefono?: string | null }>(
  righe: T[],
): { tenute: T[]; scartate: T[] } {
  const viste = new Set<string>();
  const tenute: T[] = [];
  const scartate: T[] = [];

  for (const riga of righe) {
    const chiave = chiaveDeduplica(riga);
    if (chiave === null) {
      tenute.push(riga);
      continue;
    }
    if (viste.has(chiave)) {
      scartate.push(riga);
      continue;
    }
    viste.add(chiave);
    tenute.push(riga);
  }

  return { tenute, scartate };
}
