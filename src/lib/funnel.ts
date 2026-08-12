/**
 * Funnel di acquisizione — parte pura.
 *
 * Nessun import: qui c'è solo quello che si può verificare con un test.
 *
 * ⚠️ Questa logica difende la PRIMA PORTA PUBBLICA dell'app. Tutto il resto sta
 * dietro un login; un modulo su una pagina pubblica no: lo vede internet, e
 * internet ci scrive dentro. Le regole qui sotto non sono cortesie
 * all'interfaccia, sono il primo filtro.
 */

export type Canale = 'email' | 'sms' | 'whatsapp' | 'telefono';
export const CANALI: Canale[] = ['email', 'sms', 'whatsapp', 'telefono'];

export type Invio = {
  nome: string;
  email: string;
  telefono: string;
  /** I canali spuntati. Uno per spunta: mai un blocco unico. */
  canali: Canale[];
  /** Campo civetta: invisibile a chi legge, irresistibile per un robot. */
  civetta: string;
  /** Millisecondi trascorsi dall'apertura della pagina. */
  tempoCompilazione: number;
};

export type MotivoRifiuto =
  /** Nessun recapito: non è un contatto, è un nome. */
  | 'nessun_recapito'
  | 'email_non_valida'
  /** Il campo civetta è pieno: l'ha compilato un robot. */
  | 'civetta'
  /** Compilato troppo in fretta perché l'abbia scritto una persona. */
  | 'troppo_veloce'
  /** Nessuna spunta: senza consenso non si raccoglie niente. */
  | 'nessun_consenso'
  | 'canale_non_richiesto';

export type Esito = { ok: true } | { ok: false; motivo: MotivoRifiuto };

/**
 * Il tempo minimo perché un essere umano abbia davvero letto e compilato.
 *
 * Tre secondi sono pochi per una persona e un'eternità per un robot, che
 * compila e invia nello stesso istante. Alzarlo troppo respingerebbe chi
 * incolla i dati dal telefono.
 */
export const TEMPO_MINIMO_MS = 3000;

/**
 * Verifica un invio prima di mandarlo al server.
 *
 * L'ordine dei controlli conta: i segnali di robot vengono per primi, perché a
 * un robot non si spiega cosa ha sbagliato — gli si dice di no e basta. Gli
 * errori veri (email storta, nessuna spunta) vengono dopo, e quelli sì che
 * vanno detti a chi legge.
 */
export function verificaInvio(invio: Invio, canaliRichiesti: Canale[]): Esito {
  if (invio.civetta.trim() !== '') return { ok: false, motivo: 'civetta' };
  if (invio.tempoCompilazione < TEMPO_MINIMO_MS) return { ok: false, motivo: 'troppo_veloce' };

  const email = invio.email.trim();
  const telefono = invio.telefono.trim();
  if (email === '' && telefono === '') return { ok: false, motivo: 'nessun_recapito' };
  if (email !== '' && !emailPlausibile(email)) return { ok: false, motivo: 'email_non_valida' };

  if (invio.canali.length === 0) return { ok: false, motivo: 'nessun_consenso' };
  if (invio.canali.some((c) => !canaliRichiesti.includes(c))) {
    return { ok: false, motivo: 'canale_non_richiesto' };
  }

  return { ok: true };
}

/**
 * Un controllo di plausibilità, non di validità.
 *
 * L'unico modo per sapere se un indirizzo esiste è scriverci. Qui si scarta
 * solo ciò che non può essere un indirizzo — e si resta larghi di proposito:
 * un'espressione troppo severa respinge indirizzi legittimi, e un contatto
 * perso costa più di uno finto.
 */
export function emailPlausibile(v: string): boolean {
  const t = v.trim();
  if (t.length < 6 || t.length > 254) return false;
  if (/\s/.test(t)) return false;
  return /^[^@]+@[^@.]+(\.[^@.]+)+$/.test(t);
}

/**
 * Lo slug di un funnel: è la parte finale di un indirizzo pubblico.
 * Rispecchia il CHECK del database — se diverge, l'app accetta slug che il
 * database poi rifiuta, e l'errore arriva al momento sbagliato.
 */
export function slugValido(v: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(v);
}

/** Da un titolo a uno slug utilizzabile. */
export function slugDaTitolo(titolo: string): string {
  const base = titolo
    .normalize('NFD')
    .replace(SEGNI_DIACRITICI, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  return slugValido(base) ? base : '';
}

/** I segni che `normalize('NFD')` stacca dalle lettere accentate. */
const SEGNI_DIACRITICI = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Il link pubblico da dare in giro.
 *
 * La base arriva da `EXPO_PUBLIC_FUNNEL_BASE_URL`, cioè da dove è ospitata la
 * pagina: l'app non può indovinarla. Se manca si restituisce `null` e
 * l'interfaccia mostra solo lo slug, invece di un indirizzo inventato che
 * qualcuno copierebbe e manderebbe a un cliente.
 */
export function linkPubblico(base: string | undefined, slug: string): string | null {
  const b = (base ?? '').trim();
  if (b === '' || !slugValido(slug)) return null;
  return `${b.replace(/\/+$/, '')}/?f=${slug}`;
}

/** Quanti contatti si possono ancora accettare in questa finestra. */
export function leadRimanenti(arrivatiUltimaOra: number, massimo: number): number {
  if (!Number.isFinite(massimo) || massimo <= 0) return 0;
  return Math.max(0, massimo - Math.max(0, arrivatiUltimaOra));
}

export type ErroreLead =
  | 'funnel_assente'
  | 'troppe_richieste'
  | 'nessun_recapito'
  | 'generico';

/** Traduce gli errori del database in qualcosa da mostrare. */
export function classificaErroreLead(err: unknown): ErroreLead {
  const codice = (err as { code?: unknown })?.code;
  if (codice === 'P0004') return 'funnel_assente';
  if (codice === 'P0005') return 'troppe_richieste';
  if (codice === 'P0006') return 'nessun_recapito';
  return 'generico';
}
