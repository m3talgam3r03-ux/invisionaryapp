/**
 * Memoria e tetto di spesa dell'agente — parte pura.
 *
 * Nessun import: qui c'è solo quello che si può verificare con un test.
 *
 * ⚠️ `estraiMemorie` è duplicata in `supabase/functions/_shared/memoria.ts`,
 * perché Deno e React Native non condividono moduli. È lo stesso compromesso
 * già accettato per `src/lib/domains.ts`: la copia testata è QUESTA, e se le
 * due divergono il comportamento sul server cambia in silenzio. Toccarne una
 * significa toccare l'altra.
 */

export type Categoria = 'obiettivo' | 'preferenza' | 'situazione' | 'vincolo';

export type Memoria = {
  id: string;
  fatto: string;
  categoria: Categoria;
  createdAt: string;
};

// ─── INIZIO PARTE CONDIVISA ───────────────────────────────────────────────
// Tutto ciò che sta fra questi marcatori è duplicato, IDENTICO, in
// `supabase/functions/_shared/memoria.ts`. `npm run eval` confronta i due
// blocchi e fallisce se divergono. Modificarne uno significa modificare l'altro.
const CATEGORIE: Categoria[] = ['obiettivo', 'preferenza', 'situazione', 'vincolo'];

/**
 * Il blocco che l'agente aggiunge in coda quando ha imparato qualcosa.
 *
 * Si è scelto un marcatore nel testo invece di una seconda chiamata al modello
 * per estrarre i fatti: una seconda chiamata raddoppierebbe il costo di ogni
 * messaggio, ed è proprio il costo la cosa che questa milestone deve tenere a
 * bada.
 */
const MARCATORE = /<<<RICORDA:([\s\S]*?)>>>/g;

export type Estratto = {
  /** La risposta ripulita: il marcatore non deve mai arrivare all'utente. */
  risposta: string;
  fatti: { fatto: string; categoria: Categoria }[];
};

/**
 * Separa i fatti da ricordare dalla risposta.
 *
 * Regole, e ognuna ha un motivo:
 * · il marcatore va tolto SEMPRE, anche quando è malformato — se resta a video
 *   l'utente vede le istruzioni interne dell'agente;
 * · un fatto troppo corto non dice niente e uno troppo lungo è un riassunto
 *   della conversazione, non un fatto: il database li rifiuterebbe comunque,
 *   ma è meglio non arrivarci;
 * · i duplicati nella stessa risposta si scartano qui, così non si fanno
 *   scritture destinate a fallire sull'indice unico.
 */
export function estraiMemorie(testo: string): Estratto {
  const fatti: { fatto: string; categoria: Categoria }[] = [];
  const visti = new Set<string>();

  const blocchi = testo.match(MARCATORE) ?? [];
  for (const blocco of blocchi) {
    const dentro = blocco.replace(/^<<<RICORDA:/, '').replace(/>>>$/, '');
    for (const riga of dentro.split('\n')) {
      const analizzata = leggiRiga(riga);
      if (!analizzata) continue;
      const chiave = analizzata.fatto.toLowerCase();
      if (visti.has(chiave)) continue;
      visti.add(chiave);
      fatti.push(analizzata);
    }
  }

  // Il marcatore sparisce comunque, anche se non conteneva niente di valido.
  const risposta = testo.replace(MARCATORE, '').replace(/\n{3,}/g, '\n\n').trim();
  return { risposta, fatti };
}

/** `obiettivo: vuole diventare leader entro l'anno` */
function leggiRiga(riga: string): { fatto: string; categoria: Categoria } | null {
  const pulita = riga.replace(/^[-•*\s]+/, '').trim();
  if (pulita === '') return null;

  const separatore = pulita.indexOf(':');
  let categoria: Categoria = 'situazione';
  let fatto = pulita;

  if (separatore > 0) {
    const forse = pulita.slice(0, separatore).trim().toLowerCase();
    if ((CATEGORIE as string[]).includes(forse)) {
      categoria = forse as Categoria;
      fatto = pulita.slice(separatore + 1).trim();
    }
  }

  // Gli stessi limiti del CHECK nel database: meglio non arrivarci proprio.
  if (fatto.length < 3 || fatto.length > 300) return null;
  return { fatto, categoria };
}
// ─── FINE PARTE CONDIVISA ─────────────────────────────────────────────────

// --- Tetto di spesa ---------------------------------------------------------

export type Budget = {
  richiesteOggi: number;
  richiesteMax: number;
  tokenMeseUsati: number;
  tokenMeseMax: number;
};

export type StatoBudget = 'ok' | 'quasi' | 'esaurito';

/**
 * Come sta il budget.
 *
 * «quasi» scatta all'80%: avvisare a filo di limite non serve a niente, perché
 * a quel punto non si fa più in tempo a cambiare comportamento.
 * Un massimo a zero significa «nessun limite», non «limite zero».
 */
export function statoBudget(b: Budget): StatoBudget {
  const q = Math.max(quota(b.richiesteOggi, b.richiesteMax), quota(b.tokenMeseUsati, b.tokenMeseMax));
  if (q >= 1) return 'esaurito';
  if (q >= 0.8) return 'quasi';
  return 'ok';
}

function quota(usato: number, massimo: number): number {
  if (!Number.isFinite(massimo) || massimo <= 0) return 0; // nessun limite
  if (!Number.isFinite(usato) || usato <= 0) return 0;
  return usato / massimo;
}

/** Quante domande restano oggi. `null` se non c'è limite. */
export function domandeRimaste(b: Budget): number | null {
  if (!Number.isFinite(b.richiesteMax) || b.richiesteMax <= 0) return null;
  return Math.max(0, b.richiesteMax - b.richiesteOggi);
}

export type ErroreAgente = 'limite_giornaliero' | 'limite_mensile' | 'generico';

/**
 * Traduce l'errore del database.
 *
 * `P0003` è il tetto del giorno, `P0002` quello del mese: sono due messaggi
 * diversi perché sono due attese diverse — domani contro il mese prossimo.
 */
export function classificaErroreAgente(err: unknown): ErroreAgente {
  const codice = (err as { code?: unknown })?.code;
  if (codice === 'P0003') return 'limite_giornaliero';
  if (codice === 'P0002') return 'limite_mensile';

  const messaggio = String((err as { message?: string })?.message ?? '').toLowerCase();
  if (messaggio.includes('domande di oggi')) return 'limite_giornaliero';
  if (messaggio.includes('mensile')) return 'limite_mensile';
  return 'generico';
}
