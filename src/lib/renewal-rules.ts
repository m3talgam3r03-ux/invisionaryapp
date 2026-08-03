/**
 * Regole di calcolo dei rinnovi. Funzioni pure, senza React e senza rete: sono
 * testabili da sole ed è dove vive la regola che conta.
 *
 * LA REGOLA: il rinnovo somma `interval_days` alla **scadenza precedente**, non
 * alla data di oggi. Sommare su oggi farebbe perdere giorni ogni volta che
 * un'approvazione arriva in ritardo, e lo scivolamento si accumula.
 *
 * Le date sono stringhe ISO `YYYY-MM-DD` e l'aritmetica è in UTC: sommare giorni
 * su un `Date` locale attraversando l'ora legale può far saltare o ripetere un
 * giorno.
 */

const GIORNO_MS = 86_400_000;

/** `YYYY-MM-DD` → Date a mezzanotte UTC. */
function daISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date → `YYYY-MM-DD` (parte UTC). */
function aISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** Oggi come `YYYY-MM-DD`, azzerando l'orario. */
export function oggiISO(adesso: Date = new Date()): string {
  return aISO(new Date(Date.UTC(adesso.getFullYear(), adesso.getMonth(), adesso.getDate())));
}

/** Somma giorni a una data ISO. */
export function sommaGiorni(iso: string, giorni: number): string {
  const d = daISO(iso);
  d.setUTCDate(d.getUTCDate() + giorni);
  return aISO(d);
}

/** Giorni da `a` a `b` (negativo se `b` precede `a`). */
export function giorniTra(a: string, b: string): number {
  return Math.round((daISO(b).getTime() - daISO(a).getTime()) / GIORNO_MS);
}

/**
 * La prossima scadenza dopo un rinnovo: scadenza corrente + durata.
 * Rispecchia `public.next_due_date()` del database.
 */
export function prossimaScadenza(scadenzaCorrente: string, intervalDays: number): string {
  return sommaGiorni(scadenzaCorrente, intervalDays);
}

/** Giorni di ritardo rispetto a oggi (0 se non è ancora scaduto). */
export function giorniDiRitardo(scadenzaCorrente: string, oggi: string = oggiISO()): number {
  return Math.max(0, giorniTra(scadenzaCorrente, oggi));
}

/**
 * Quanti interi periodi di rinnovo sono passati dalla scadenza.
 * Serve a capire se un semplice «+1 periodo» lascerebbe la scadenza ancora nel
 * passato.
 */
export function periodiDiRitardo(
  scadenzaCorrente: string,
  intervalDays: number,
  oggi: string = oggiISO(),
): number {
  if (intervalDays <= 0) return 0;
  return Math.floor(giorniDiRitardo(scadenzaCorrente, oggi) / intervalDays);
}

/**
 * Vero se la scadenza è vecchia di più di due periodi: in quel caso non si
 * decide al posto dell'utente, gli si chiede quale data vuole.
 */
export function serveConfermaEsplicita(
  scadenzaCorrente: string,
  intervalDays: number,
  oggi: string = oggiISO(),
): boolean {
  return periodiDiRitardo(scadenzaCorrente, intervalDays, oggi) > 2;
}

/**
 * Avanza di un periodo alla volta finché la scadenza non supera oggi.
 * È l'alternativa al singolo «+1 periodo» quando il rinnovo è molto arretrato:
 * mantiene l'allineamento con le scadenze originali invece di ripartire da oggi.
 */
export function recuperaScadenza(
  scadenzaCorrente: string,
  intervalDays: number,
  oggi: string = oggiISO(),
): string {
  if (intervalDays <= 0) return scadenzaCorrente;
  const periodi = periodiDiRitardo(scadenzaCorrente, intervalDays, oggi) + 1;
  return sommaGiorni(scadenzaCorrente, periodi * intervalDays);
}

/**
 * Le due proposte da mettere davanti a chi approva un rinnovo arretrato:
 * un solo periodo (resta indietro) oppure il recupero fino a superare oggi.
 */
export type OpzioniRinnovo = {
  unPeriodo: string;
  recupero: string;
  periodiDiRitardo: number;
  serveConferma: boolean;
  /** Vero se le due proposte coincidono: nessuna scelta da fare. */
  coincidono: boolean;
};

export function opzioniRinnovo(
  scadenzaCorrente: string,
  intervalDays: number,
  oggi: string = oggiISO(),
): OpzioniRinnovo {
  const unPeriodo = prossimaScadenza(scadenzaCorrente, intervalDays);
  const recupero = recuperaScadenza(scadenzaCorrente, intervalDays, oggi);
  return {
    unPeriodo,
    recupero,
    periodiDiRitardo: periodiDiRitardo(scadenzaCorrente, intervalDays, oggi),
    serveConferma: serveConfermaEsplicita(scadenzaCorrente, intervalDays, oggi),
    coincidono: unPeriodo === recupero,
  };
}
