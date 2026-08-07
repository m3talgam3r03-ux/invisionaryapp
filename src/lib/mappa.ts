import italia from '@svg-maps/italy';

/**
 * La mappa degli iscritti per regione — parte pura.
 *
 * I contorni sono quelli veri: arrivano da `@svg-maps/italy` (dati ISTAT,
 * CC-BY-4.0), 20 percorsi SVG in un `viewBox` di 610 × 793. Qui non si disegna
 * niente — si traducono i nomi, si uniscono ai conteggi e si decide il colore.
 *
 * ── I NOMI SONO IN INGLESE, IL DATABASE LI VUOLE IN ITALIANO ──
 * Il pacchetto dice «Lombardy», «Apulia», «Aosta Valley». Il CHECK su
 * `profiles.regione` accetta solo i 20 nomi ufficiali italiani. La traduzione
 * sta qui, in un posto solo, e un test verifica che copra tutte e venti: se un
 * domani il pacchetto rinominasse una regione, il test cade prima che la mappa
 * si ritrovi un buco muto.
 *
 * Modulo puro: nessun import da React Native. Il pacchetto della mappa è dati.
 */

/** Dal nome del pacchetto a quello ufficiale italiano. */
const NOMI_ITALIANI: Record<string, string> = {
  Abruzzo: 'Abruzzo',
  'Aosta Valley': "Valle d'Aosta",
  Apulia: 'Puglia',
  Basilicata: 'Basilicata',
  Calabria: 'Calabria',
  Campania: 'Campania',
  'Emilia-Romagna': 'Emilia-Romagna',
  'Friuli-Venezia Giulia': 'Friuli-Venezia Giulia',
  Lazio: 'Lazio',
  Liguria: 'Liguria',
  Lombardy: 'Lombardia',
  Marche: 'Marche',
  Molise: 'Molise',
  Piedmont: 'Piemonte',
  Sardinia: 'Sardegna',
  Sicily: 'Sicilia',
  'Trentino-South Tyrol': 'Trentino-Alto Adige',
  Tuscany: 'Toscana',
  Umbria: 'Umbria',
  Veneto: 'Veneto',
};

type LocationSvg = { id: string; name: string; path: string };
const MAPPA_SVG = (italia as unknown as { default?: unknown }).default ?? italia;
const SORGENTE = MAPPA_SVG as { viewBox: string; locations: LocationSvg[] };

/** Il riquadro entro cui vivono i percorsi. */
export const VIEW_BOX = SORGENTE.viewBox;

export type Regione = {
  /** Nome ufficiale italiano: è quello che sta nel database. */
  nome: string;
  /** Identificativo del pacchetto, usato come chiave di disegno. */
  id: string;
  /** Il contorno vero, in coordinate del viewBox. */
  contorno: string;
};

/** Le 20 regioni coi contorni reali, ordinate per nome italiano. */
export const REGIONI: Regione[] = SORGENTE.locations
  .map((l) => ({
    nome: NOMI_ITALIANI[l.name] ?? l.name,
    id: l.id,
    contorno: l.path,
  }))
  .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

/** I 20 nomi ufficiali, come li accetta il CHECK del database. */
export const NOMI_REGIONI: string[] = REGIONI.map((r) => r.nome);

/**
 * Il conteggio di una regione.
 * `iscritti` è `null` quando il database ha soppresso il numero perché troppo
 * piccolo: `null` non è zero, e i due casi si mostrano in modo diverso.
 */
export type ConteggioRegione = {
  regione: string;
  iscritti: number | null;
};

export type RegioneDisegnata = Regione & {
  /** `null` = nascosto per pochi iscritti; `0` = nessun iscritto. */
  iscritti: number | null;
  /** Livello di colore da 0 (vuoto) a 4 (il più pieno). */
  livello: number;
  /** Vero se il numero c'è ma non si può mostrare. */
  nascosto: boolean;
};

/**
 * Unisce le regioni ai conteggi e assegna il livello di colore.
 *
 * Le soglie si calcolano sul MASSIMO osservato, non su valori fissi: una rete
 * di 50 persone e una di 5.000 devono produrre entrambe una mappa leggibile.
 * Con soglie fisse, la prima sarebbe tutta dello stesso colore.
 */
export function costruisciMappa(conteggi: ConteggioRegione[]): RegioneDisegnata[] {
  const per = new Map(conteggi.map((c) => [c.regione, c.iscritti]));
  const massimo = Math.max(0, ...conteggi.map((c) => c.iscritti ?? 0));

  return REGIONI.map((r) => {
    const presente = per.has(r.nome);
    const iscritti = presente ? (per.get(r.nome) ?? null) : 0;
    return {
      ...r,
      iscritti,
      nascosto: presente && iscritti === null,
      livello: livelloColore(iscritti, massimo),
    };
  });
}

/**
 * Da 0 a 4. Una regione nascosta prende il livello 1: si vede che c'è
 * qualcuno, senza dire quanti — mostrarla vuota sarebbe una bugia.
 */
export function livelloColore(iscritti: number | null, massimo: number): number {
  if (iscritti === null) return 1;
  if (iscritti <= 0) return 0;
  if (massimo <= 0) return 0;
  const quota = iscritti / massimo;
  if (quota > 0.75) return 4;
  if (quota > 0.5) return 3;
  if (quota > 0.25) return 2;
  return 1;
}

export type RiepilogoMappa = {
  totaleVisibile: number;
  regioniVisibili: number;
  regioniNascoste: number;
  senzaRegione: number;
};

/**
 * La riga sotto la mappa.
 *
 * Dice sempre quante regioni sono nascoste: una mappa che tace su ciò che non
 * mostra fa credere che il vuoto sia vuoto davvero.
 */
export function testoRiepilogo(r: RiepilogoMappa): string {
  const parti: string[] = [];
  parti.push(
    `${r.totaleVisibile} ${r.totaleVisibile === 1 ? 'iscritto' : 'iscritti'} ` +
      `in ${r.regioniVisibili} ${r.regioniVisibili === 1 ? 'regione' : 'regioni'}`,
  );
  if (r.regioniNascoste > 0) {
    parti.push(
      `${r.regioniNascoste} ${r.regioniNascoste === 1 ? 'regione ha' : 'regioni hanno'} ` +
        'troppi pochi iscritti per essere mostrate',
    );
  }
  if (r.senzaRegione > 0) {
    parti.push(`${r.senzaRegione} non ha indicato la regione`);
  }
  return parti.join(' · ') + '.';
}

/** La regione più popolosa fra quelle mostrabili. `null` se non se ne può dire nessuna. */
export function regionePiuAffollata(conteggi: ConteggioRegione[]): ConteggioRegione | null {
  const visibili = conteggi.filter((c) => c.iscritti !== null && c.iscritti > 0);
  if (visibili.length === 0) return null;
  return visibili.reduce((a, b) => ((b.iscritti ?? 0) > (a.iscritti ?? 0) ? b : a));
}

/** Vero se il nome è una delle 20 regioni. Rispecchia il CHECK del database. */
export function regioneValida(nome: string): boolean {
  return NOMI_REGIONI.includes(nome);
}

// --- Zoom e trascinamento ---------------------------------------------------

export type Vista = { x: number; y: number; scala: number };

export const VISTA_INIZIALE: Vista = { x: 0, y: 0, scala: 1 };
export const SCALA_MIN = 1;
export const SCALA_MAX = 6;

/**
 * Applica uno zoom tenendo fermo il punto toccato.
 *
 * Senza questo, ingrandire sposterebbe sotto le dita la zona che si stava
 * guardando: si zooma sulla Sicilia e ci si ritrova sull'Emilia. Il punto
 * `fuocoX/Y` è in coordinate del riquadro visibile, da 0 a 1.
 */
export function zooma(vista: Vista, fattore: number, fuocoX = 0.5, fuocoY = 0.5): Vista {
  const nuova = limita(vista.scala * fattore, SCALA_MIN, SCALA_MAX);
  if (nuova === vista.scala) return vista;

  // La porzione visibile passa da 1/scala a 1/nuova: l'origine si sposta della
  // differenza, pesata su dove si è puntato.
  const x = vista.x + fuocoX * (1 / vista.scala - 1 / nuova);
  const y = vista.y + fuocoY * (1 / vista.scala - 1 / nuova);
  return contieni({ x, y, scala: nuova });
}

/** Trascina di uno spostamento espresso in frazioni di schermo. */
export function trascina(vista: Vista, dx: number, dy: number): Vista {
  return contieni({
    x: vista.x - dx / vista.scala,
    y: vista.y - dy / vista.scala,
    scala: vista.scala,
  });
}

/**
 * Tiene la vista dentro la mappa.
 *
 * Senza, trascinando si porta l'Italia fuori dallo schermo e resta un
 * rettangolo vuoto: da lì nessuno capisce come tornare indietro.
 */
export function contieni(vista: Vista): Vista {
  const porzione = 1 / vista.scala;
  const massimo = Math.max(0, 1 - porzione);
  return {
    scala: vista.scala,
    x: limita(vista.x, 0, massimo),
    y: limita(vista.y, 0, massimo),
  };
}

/** Il `viewBox` da dare all'SVG per la vista corrente. */
export function viewBoxDiVista(vista: Vista): string {
  const [, , larghezza, altezza] = VIEW_BOX.split(/\s+/).map(Number);
  const l = larghezza / vista.scala;
  const a = altezza / vista.scala;
  return `${vista.x * larghezza} ${vista.y * altezza} ${l} ${a}`;
}

function limita(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
