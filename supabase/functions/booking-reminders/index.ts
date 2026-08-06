// ============================================================================
// Edge Function (Deno) — Promemoria degli appuntamenti.
// Da schedulare via cron ogni 15 minuti (vedi supabase/README.md).
//
// Quali appuntamenti siano da avvisare NON lo decide questo file: lo decide
// `appuntamenti_da_avvisare()` nel database. Così la regola è una sola, vale
// per qualunque chiamante e si può verificare con una query.
//
// Il doppio invio è impossibile per costruzione: `booking_reminders` ha come
// chiave primaria (booking_id, offset_minuti), quindi una seconda esecuzione
// nello stesso quarto d'ora non aggiunge nulla e non manda nulla.
//
// SI AVVISANO ENTRAMBI. Un appuntamento è un impegno reciproco: mandare
// l'avviso solo a chi ha prenotato lascerebbe l'altro a scoprirlo da solo.
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono iniettati automaticamente
// nell'ambiente della function deployata.
// ============================================================================
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const LOTTO_EXPO = 100;

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type DaAvvisare = {
  booking_id: string;
  host_id: string;
  guest_id: string;
  inizio: string;
  minuti_mancanti: number;
  offsets_coperti: number[];
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Variabili SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti.' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data, error } = await supabase.rpc('appuntamenti_da_avvisare');
    if (error) throw error;

    const dovuti = (data ?? []) as DaAvvisare[];
    if (dovuti.length === 0) return json({ appuntamenti: 0, inviati: 0 });

    const nomi = await caricaNomi(
      supabase,
      dovuti.flatMap((a) => [a.host_id, a.guest_id]),
    );
    const token = await caricaToken(
      supabase,
      dovuti.flatMap((a) => [a.host_id, a.guest_id]),
    );

    const messaggi: ExpoMessage[] = [];
    for (const a of dovuti) {
      // A ciascuno il nome dell'altro: «Call con Marco», non «Call con te».
      aggiungi(messaggi, token.get(a.guest_id), a, nomi.get(a.host_id));
      aggiungi(messaggi, token.get(a.host_id), a, nomi.get(a.guest_id));
    }

    await inviaPush(messaggi);

    // Si registrano TUTTI gli scaglioni coperti, anche quelli che il cron ha
    // saltato: altrimenti riemergerebbero al giro dopo e manderebbero un
    // doppione a ridosso dell'appuntamento.
    const righe = dovuti.flatMap((a) =>
      a.offsets_coperti.map((off) => ({ booking_id: a.booking_id, offset_minuti: off })),
    );
    if (righe.length > 0) {
      const { error: errIns } = await supabase
        .from('booking_reminders')
        .upsert(righe, { onConflict: 'booking_id,offset_minuti', ignoreDuplicates: true });
      if (errIns) throw errIns;
    }

    return json({ appuntamenti: dovuti.length, inviati: messaggi.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore interno.' }, 500);
  }
});

function aggiungi(
  messaggi: ExpoMessage[],
  token: string[] | undefined,
  a: DaAvvisare,
  altro: string | undefined,
): void {
  for (const to of token ?? []) {
    messaggi.push({
      to,
      title: titolo(a.minuti_mancanti),
      body: corpo(a, altro),
      data: { bookingId: a.booking_id, schermata: 'calendario' },
    });
  }
}

function titolo(minuti: number): string {
  if (minuti <= 90) return 'Appuntamento fra poco';
  return 'Appuntamento domani';
}

function corpo(a: DaAvvisare, altro: string | undefined): string {
  const chi = altro ? ` con ${altro}` : '';
  return `Appuntamento${chi} alle ${oraItaliana(a.inizio)}.`;
}

/**
 * L'ora nel fuso italiano.
 *
 * L'avviso lo scrive il server, che gira in UTC: senza conversione direbbe
 * un'ora sbagliata di due. `Europe/Rome` è il fuso della rete; quando ci
 * saranno utenti altrove andrà preso da `profiles.fuso`.
 */
function oraItaliana(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  });
}

async function caricaNomi(
  supabase: SupabaseClient,
  utenti: string[],
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', [...new Set(utenti)]);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id as string, p.full_name as string]));
}

async function caricaToken(
  supabase: SupabaseClient,
  utenti: string[],
): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', [...new Set(utenti)]);
  if (error) throw error;

  const mappa = new Map<string, string[]>();
  for (const t of data ?? []) {
    const lista = mappa.get(t.user_id) ?? [];
    lista.push(t.token);
    mappa.set(t.user_id, lista);
  }
  return mappa;
}

async function inviaPush(messaggi: ExpoMessage[]): Promise<void> {
  for (let i = 0; i < messaggi.length; i += LOTTO_EXPO) {
    const lotto = messaggi.slice(i, i + LOTTO_EXPO);
    if (lotto.length === 0) continue;
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(lotto),
    });
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
