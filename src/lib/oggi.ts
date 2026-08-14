/**
 * Cosa richiede attenzione, adesso.
 *
 * ── PERCHÉ ESISTE ──
 * In cima alla dashboard c'era un riquadro che cambiava col ruolo e diceva, al
 * leader, «qui vedrai i tuoi collaboratori, i loro rinnovi e l'avanzamento
 * formazione». Una promessa, non un'informazione: descriveva l'app invece di
 * dire come vanno le cose. Il collaboratore stava messo peggio — «clienti,
 * rinnovi e formazione: tutto in un unico posto» — cioè l'elenco dei quattro
 * pilastri che stavano già disegnati sopra.
 *
 * Questo modulo risponde alla domanda vera: **cosa devo fare oggi?** La risposta
 * cambia col ruolo perché cambiano i dati che si vedono, non perché ci sia un
 * `if (ruolo)` da qualche parte: il perimetro lo decide la RLS, qui si guarda
 * quello che è arrivato.
 *
 * ── COSA NON FA ──
 * Non inventa urgenze. Se non c'è niente in sospeso lo dice, e va bene così:
 * una dashboard che trova sempre qualcosa da segnalare smette di essere letta.
 */
import type { RenewalWithClient } from '@/types/models';

/** Un impegno da mostrare, già ordinato per urgenza. */
export type Impegno =
  /** Scadenze già passate: la cosa più urgente che ci sia. */
  | { tipo: 'scaduti'; quanti: number }
  /** Rinnovi che aspettano il mio sì. Qualcuno è fermo finché non decido. */
  | { tipo: 'da_approvare'; quanti: number }
  /** In scadenza entro `giorni`. */
  | { tipo: 'in_scadenza'; quanti: number; giorni: number }
  /** Il prossimo appuntamento confermato. */
  | { tipo: 'appuntamento'; quando: string; conChi: string | null };

/** La forma minima di prenotazione che serve qui. */
export type PrenotazioneMinima = {
  inizio: string;
  stato: string;
  hostId: string;
  guestId: string;
  hostNome: string | null;
  guestNome: string | null;
};

/** Finestra di preavviso: oltre, non è ancora una cosa di «oggi». */
export const GIORNI_PREAVVISO = 14;

/**
 * Gli impegni, dal più urgente.
 *
 * `puoApprovare` non è il ruolo: è il risultato di `can(profilo,
 * 'renewals.approve')` calcolato dal chiamante. Questo modulo non conosce i
 * ruoli, e non deve — è la regola dell'app, e vale anche quando fa comodo
 * romperla.
 */
export function impegniDelGiorno(
  rinnovi: RenewalWithClient[],
  prenotazioni: PrenotazioneMinima[],
  oggi: Date,
  io: string,
  puoApprovare: boolean,
): Impegno[] {
  const impegni: Impegno[] = [];

  // Un rinnovo finisce in UN solo secchiello, il più urgente che gli spetta:
  // contarlo due volte gonfierebbe i numeri e farebbe sembrare il lavoro il
  // doppio di quello che è.
  let scaduti = 0;
  let daApprovare = 0;
  let inScadenza = 0;

  for (const r of rinnovi) {
    if (r.status === 'annullato') continue;

    const giorni = giorniA(r.current_due_date, oggi);

    if (r.status === 'scaduto' || giorni < 0) {
      scaduti++;
      continue;
    }

    // «Da approvare» conta solo per chi può davvero decidere, e solo sulle
    // richieste altrui: il proprio rinnovo in attesa non è un'azione mia.
    if (r.status === 'in_attesa_approvazione') {
      if (puoApprovare && r.owner_id !== io) daApprovare++;
      continue;
    }

    if (giorni <= GIORNI_PREAVVISO) inScadenza++;
  }

  if (scaduti > 0) impegni.push({ tipo: 'scaduti', quanti: scaduti });
  if (daApprovare > 0) impegni.push({ tipo: 'da_approvare', quanti: daApprovare });
  if (inScadenza > 0) {
    impegni.push({ tipo: 'in_scadenza', quanti: inScadenza, giorni: GIORNI_PREAVVISO });
  }

  const prossimo = prossimoAppuntamento(prenotazioni, oggi, io);
  if (prossimo) impegni.push(prossimo);

  return impegni;
}

/**
 * Il primo appuntamento confermato che deve ancora arrivare.
 *
 * `conChi` è l'altra persona, non la mia: in un appuntamento so già di esserci.
 */
export function prossimoAppuntamento(
  prenotazioni: PrenotazioneMinima[],
  oggi: Date,
  io: string,
): Impegno | null {
  const ora = oggi.getTime();

  const futuri = prenotazioni
    .filter((p) => p.stato === 'confermata')
    .filter((p) => {
      const quando = Date.parse(p.inizio);
      return Number.isFinite(quando) && quando >= ora;
    })
    .sort((a, b) => Date.parse(a.inizio) - Date.parse(b.inizio));

  const p = futuri[0];
  if (!p) return null;

  const conChi = p.hostId === io ? p.guestNome : p.hostNome;
  return { tipo: 'appuntamento', quando: p.inizio, conChi };
}

/**
 * Giorni da oggi alla scadenza. Negativo = già passata.
 *
 * Il confronto è fra giorni di calendario, non fra istanti: una scadenza oggi
 * alle 23 non è «scaduta» perché sono le 23:30. Le date arrivano come
 * `YYYY-MM-DD`, quindi basta troncare anche l'altro capo.
 */
export function giorniA(scadenzaISO: string, oggi: Date): number {
  const scadenza = Date.parse(`${scadenzaISO.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(scadenza)) return Number.POSITIVE_INFINITY;

  const inizioGiornata = Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.round((scadenza - inizioGiornata) / 86_400_000);
}

/** Vero quando non c'è niente da fare — e va detto, non nascosto. */
export function tuttoInOrdine(impegni: Impegno[]): boolean {
  return impegni.length === 0;
}
