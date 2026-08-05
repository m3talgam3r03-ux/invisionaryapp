/**
 * Rubrica del telefono → contatti del CRM.
 *
 * ⚠️ NIENTE VIENE COPIATO DA SOLO. L'app legge la rubrica e mostra chi c'è, ma
 * l'importazione avviene solo su selezione esplicita. Nella rubrica di una
 * persona ci sono il medico, i familiari, il meccanico: gente che non ha mai
 * accettato di stare in un CRM aziendale, e che non deve finirci per errore.
 *
 * Per la stessa ragione i contatti importati nascono SENZA consensi registrati,
 * quindi non contattabili (vedi migrazione 0018): la rubrica dice che hai il
 * numero di qualcuno, non che ti ha autorizzato a scrivergli.
 *
 * Il modulo nativo si carica con `require` pigro dentro try/catch, come per la
 * dettatura: su web e in Expo Go senza development build non esiste, e l'app
 * deve continuare a funzionare mostrando che la funzione non è disponibile.
 *
 * Nessun import da react-native, di proposito: così questo modulo si può
 * testare senza caricare l'intero runtime nativo.
 */
import { normalizzaEmail, normalizzaTelefono } from './normalize';

/** Una voce della rubrica, già ridotta a ciò che serve al CRM. */
export type VoceRubrica = {
  /** Id della voce sul dispositivo: serve solo per la selezione, non si salva. */
  id: string;
  nome: string;
  email: string | null;
  telefono: string | null;
};

/** Forma minima di ciò che restituisce expo-contacts, senza dipenderne nei tipi. */
type ContattoNativo = {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  emails?: { email?: string }[];
  phoneNumbers?: { number?: string }[];
};

/**
 * Converte una voce nativa nel nostro formato.
 * Funzione pura: è qui che vive la logica, ed è quella che i test coprono.
 *
 * Restituisce `null` quando la voce non è utilizzabile — senza nome non si può
 * mostrare nulla, e senza né email né telefono non c'è modo di contattarla né
 * di riconoscerla come doppione.
 */
export function convertiVoce(c: ContattoNativo, indice = 0): VoceRubrica | null {
  const nome =
    c.name?.trim() || [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || '';
  if (!nome) return null;

  const email = normalizzaEmail(c.emails?.find((e) => e.email)?.email ?? null);
  const telefono = normalizzaTelefono(c.phoneNumbers?.find((p) => p.number)?.number ?? null);
  if (!email && !telefono) return null;

  return { id: c.id ?? `rubrica-${indice}`, nome, email, telefono };
}

/** Converte l'intera rubrica, scartando le voci inutilizzabili e ordinando per nome. */
export function convertiRubrica(contatti: ContattoNativo[]): VoceRubrica[] {
  const voci: VoceRubrica[] = [];
  contatti.forEach((c, i) => {
    const v = convertiVoce(c, i);
    if (v) voci.push(v);
  });
  return voci.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

/**
 * Il modulo nativo, se esiste in questo ambiente.
 * Su web e in Expo Go senza development build il `require` fallisce: è il
 * comportamento atteso, non un errore da segnalare.
 */
function moduloNativo(): typeof import('expo-contacts') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-contacts') as typeof import('expo-contacts');
    return typeof mod?.getContactsAsync === 'function' ? mod : null;
  } catch {
    return null;
  }
}

/** Vero se su questo dispositivo la rubrica è leggibile. */
export function rubricaDisponibile(): boolean {
  return moduloNativo() !== null;
}

export type EsitoRubrica =
  | { stato: 'non_disponibile' }
  | { stato: 'permesso_negato' }
  | { stato: 'ok'; voci: VoceRubrica[] };

/**
 * Chiede il permesso e legge la rubrica.
 * Il permesso lo chiede il sistema operativo: se l'utente dice no, si torna
 * indietro senza insistere.
 */
export async function leggiRubrica(): Promise<EsitoRubrica> {
  const Contacts = moduloNativo();
  if (!Contacts) return { stato: 'non_disponibile' };

  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return { stato: 'permesso_negato' };

    const { data } = await Contacts.getContactsAsync({
      // Solo i campi che servono: leggerne di più sarebbe raccogliere dati
      // che poi non usiamo.
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.Emails,
        Contacts.Fields.PhoneNumbers,
      ],
    });

    return { stato: 'ok', voci: convertiRubrica(data as ContattoNativo[]) };
  } catch {
    // Ambiente senza supporto reale (es. web): non è un errore da mostrare.
    return { stato: 'non_disponibile' };
  }
}
