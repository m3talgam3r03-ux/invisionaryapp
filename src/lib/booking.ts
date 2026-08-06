/**
 * Logica delle prenotazioni — parte pura.
 *
 * Nessun import: né React Native né Supabase. Qui vive quello che si può
 * verificare con un test, e resta fuori quello che dipende dalla rete o dal
 * dispositivo.
 *
 * SUL FUSO ORARIO
 * Gli slot arrivano dal database come istanti assoluti (ISO con offset). L'app
 * li mostra nell'ora del DISPOSITIVO, che è quella che chi guarda si aspetta di
 * vedere. Quando il fuso di chi ospita è diverso, l'interfaccia lo dichiara:
 * un collaboratore a Londra deve sapere che «le 15» del suo leader sono le 14
 * per lui, non scoprirlo il giorno dell'appuntamento.
 */

export type Slot = {
  /** ISO 8601 con offset. */
  inizio: string;
  fine: string;
};

export type GiornoDiSlot = {
  /** `AAAA-MM-GG` nell'ora locale del dispositivo: serve solo a raggruppare. */
  chiave: string;
  /** Mezzanotte locale di quel giorno, per formattare l'intestazione. */
  data: Date;
  slot: Slot[];
};

/** `AAAA-MM-GG` dalla data locale. Non usa `toISOString`, che passa per UTC. */
export function chiaveGiorno(d: Date): string {
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mese}-${giorno}`;
}

/**
 * Raggruppa gli slot per giornata, in ordine cronologico.
 * Gli slot con data non valida vengono scartati: meglio mostrarne uno in meno
 * che una riga «Invalid Date» su cui qualcuno prova a cliccare.
 */
export function raggruppaSlot(slot: Slot[]): GiornoDiSlot[] {
  const gruppi = new Map<string, GiornoDiSlot>();

  for (const s of slot) {
    const d = new Date(s.inizio);
    if (Number.isNaN(d.getTime())) continue;

    const chiave = chiaveGiorno(d);
    let gruppo = gruppi.get(chiave);
    if (!gruppo) {
      gruppo = {
        chiave,
        data: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        slot: [],
      };
      gruppi.set(chiave, gruppo);
    }
    gruppo.slot.push(s);
  }

  const ordinati = [...gruppi.values()].sort((a, b) => a.chiave.localeCompare(b.chiave));
  for (const g of ordinati) {
    g.slot.sort((a, b) => a.inizio.localeCompare(b.inizio));
  }
  return ordinati;
}

// --- Regole di disponibilità ------------------------------------------------

/** Minuti dalla mezzanotte per un orario `HH:MM` o `HH:MM:SS`. `null` se non valido. */
export function minutiDaOrario(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v.trim());
  if (!m) return null;
  const ore = Number(m[1]);
  const minuti = Number(m[2]);
  if (ore > 23 || minuti > 59) return null;
  return ore * 60 + minuti;
}

/** `HH:MM` da minuti dalla mezzanotte. */
export function orarioDaMinuti(minuti: number): string {
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  return `${String(ore).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

export type EsitoRegola =
  | { valida: true; slotGenerati: number; avanzo: number }
  | { valida: false; motivo: 'orario_non_valido' | 'fine_prima_di_inizio' | 'durata_non_valida' | 'finestra_troppo_corta' };

/**
 * Verifica una regola di disponibilità e dice quanti appuntamenti genera.
 *
 * `avanzo` sono i minuti finali che non bastano per un altro slot: 9:00–12:00
 * a 45 minuti dà 4 slot e 0 di avanzo, ma 9:00–11:00 a 45 minuti dà 2 slot e
 * 30 minuti che restano fuori. Mostrarlo evita la sorpresa di una finestra che
 * sembra più lunga di quello che produce.
 */
export function verificaRegola(
  oraInizio: string,
  oraFine: string,
  durataMinuti: number,
): EsitoRegola {
  const inizio = minutiDaOrario(oraInizio);
  const fine = minutiDaOrario(oraFine);
  if (inizio === null || fine === null) return { valida: false, motivo: 'orario_non_valido' };
  if (fine <= inizio) return { valida: false, motivo: 'fine_prima_di_inizio' };
  if (!Number.isInteger(durataMinuti) || durataMinuti < 5 || durataMinuti > 480) {
    return { valida: false, motivo: 'durata_non_valida' };
  }

  const finestra = fine - inizio;
  const slotGenerati = Math.floor(finestra / durataMinuti);
  if (slotGenerati < 1) return { valida: false, motivo: 'finestra_troppo_corta' };

  return { valida: true, slotGenerati, avanzo: finestra - slotGenerati * durataMinuti };
}

// --- Errori del database ----------------------------------------------------

export type ErrorePrenotazione =
  /** Il vincolo di esclusione ha rifiutato: qualcuno ha preso lo slot per primo. */
  | 'slot_occupato'
  /** Il trigger ha rifiutato: l'orario non è fra quelli pubblicati. */
  | 'slot_non_disponibile'
  | 'generico';

/**
 * Traduce l'errore di Postgres in qualcosa da dire a chi sta prenotando.
 *
 * `23P01` è l'esclusione: significa che fra il momento in cui la schermata ha
 * mostrato lo slot e quello in cui è stato toccato, un'altra persona lo ha
 * preso. Non è un bug ed è esattamente ciò che il vincolo deve fare — l'app
 * deve solo dirlo e ricaricare, invece di mostrare un errore tecnico.
 */
export function classificaErrore(err: unknown): ErrorePrenotazione {
  const codice = leggiCodice(err);
  if (codice === '23P01') return 'slot_occupato';
  if (codice === '23514' || codice === 'P0001') return 'slot_non_disponibile';

  // Alcuni livelli perdono il codice per strada: si ripiega sul messaggio.
  const messaggio = String((err as { message?: string })?.message ?? '').toLowerCase();
  if (messaggio.includes('sovrapposizioni') || messaggio.includes('exclusion')) {
    return 'slot_occupato';
  }
  if (messaggio.includes('disponibili')) return 'slot_non_disponibile';
  return 'generico';
}

function leggiCodice(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const codice = (err as { code?: unknown }).code;
  return typeof codice === 'string' ? codice : null;
}

// --- Fuso orario ------------------------------------------------------------

/** Fuso del dispositivo, o `null` se l'ambiente non sa dirlo. */
export function fusoDispositivo(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Vero se conviene avvisare che gli orari sono mostrati in un fuso diverso da
 * quello di chi ospita. In dubbio non si avvisa: un avviso sbagliato su ogni
 * schermata è peggio di nessun avviso.
 */
export function fusoDaSegnalare(fusoHost: string | null | undefined): boolean {
  if (!fusoHost) return false;
  const mio = fusoDispositivo();
  if (!mio) return false;
  return mio !== fusoHost;
}
