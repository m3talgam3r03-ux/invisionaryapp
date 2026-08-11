// ============================================================================
// Memoria dell'agente — lato server.
//
// ⚠️ `estraiMemorie` è la copia di `src/lib/agente.ts`, dove vive la versione
// COPERTA DA TEST. Deno e React Native non condividono moduli: è lo stesso
// compromesso già accettato per `src/lib/domains.ts`. Toccarne una significa
// toccare l'altra, e la verità è quella testata.
// ============================================================================
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type Categoria = 'obiettivo' | 'preferenza' | 'situazione' | 'vincolo';

// ─── INIZIO PARTE CONDIVISA ───────────────────────────────────────────────
// Tutto ciò che sta fra questi marcatori è duplicato, IDENTICO, in
// `src/lib/agente.ts`, dove vive la versione COPERTA DA TEST. `npm run eval`
// confronta i due blocchi e fallisce se divergono.
const CATEGORIE: Categoria[] = ['obiettivo', 'preferenza', 'situazione', 'vincolo'];
const MARCATORE = /<<<RICORDA:([\s\S]*?)>>>/g;

export type Estratto = {
  risposta: string;
  fatti: { fatto: string; categoria: Categoria }[];
};

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

  const risposta = testo.replace(MARCATORE, '').replace(/\n{3,}/g, '\n\n').trim();
  return { risposta, fatti };
}

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

  if (fatto.length < 3 || fatto.length > 300) return null;
  return { fatto, categoria };
}
// ─── FINE PARTE CONDIVISA ─────────────────────────────────────────────────

// --- Lettura e scrittura ----------------------------------------------------

/** Cosa l'agente ricorda di questa persona, dal più recente. */
export async function caricaMemorie(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await admin
    .from('ai_memory')
    .select('fatto, categoria')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((r) => `${r.categoria}: ${r.fatto}`);
}

/**
 * Salva i fatti nuovi.
 *
 * `ignoreDuplicates` perché l'indice unico su (utente, fatto) è la difesa vera:
 * lo stesso ricordo annotato due volte non è un errore da propagare all'utente,
 * è semplicemente niente da fare.
 */
export async function salvaMemorie(
  admin: SupabaseClient,
  userId: string,
  fatti: { fatto: string; categoria: Categoria }[],
): Promise<void> {
  if (fatti.length === 0) return;
  const { error } = await admin
    .from('ai_memory')
    .upsert(
      fatti.map((f) => ({ user_id: userId, fatto: f.fatto, categoria: f.categoria })),
      { onConflict: 'user_id,fatto', ignoreDuplicates: true },
    );
  // Un ricordo non salvato non deve far fallire una risposta già prodotta.
  if (error) console.error('Memoria non salvata:', error.message);
}

/**
 * L'istruzione che insegna all'agente a ricordare.
 *
 * Il tono conta: senza il freno, un modello annota qualunque cosa e in tre
 * conversazioni la memoria è piena di dettagli inutili che occupano il prompt
 * e peggiorano le risposte invece di migliorarle.
 */
export function istruzioniMemoria(memorie: string[]): string {
  const cosaSo =
    memorie.length > 0
      ? `\n\nQUELLO CHE GIÀ SAI DI QUESTA PERSONA (da conversazioni precedenti):\n${memorie
          .map((m) => `- ${m}`)
          .join('\n')}\nUsalo per calibrare la risposta. Non elencarlo e non dire «come mi avevi detto»: dallo per scontato, come farebbe qualcuno che si ricorda.`
      : '';

  return `${cosaSo}

MEMORIA — quando imparare qualcosa di stabile su questa persona (un obiettivo, un vincolo, una preferenza di lavoro, una situazione che durerà), aggiungi ALLA FINE della risposta un blocco così:

<<<RICORDA:
obiettivo: vuole passare a leader entro l'anno
vincolo: può lavorare solo la sera
>>>

Regole:
- Solo fatti STABILI e utili nelle prossime conversazioni. Non il contenuto della domanda di oggi.
- Una riga per fatto, in terza persona, sotto i 300 caratteri.
- Categorie ammesse: obiettivo, preferenza, situazione, vincolo.
- Se non hai imparato niente di stabile, NON scrivere il blocco. È il caso normale: nella maggior parte dei messaggi non c'è niente da ricordare.
- Mai annotare dati di terzi (nomi di clienti, di colleghi, numeri, indirizzi): la memoria riguarda chi ti sta scrivendo, nessun altro.`;
}
