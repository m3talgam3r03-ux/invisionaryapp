// ============================================================================
// Edge Function (Deno) — Avvisi push sui rinnovi.
// Da schedulare via cron (vedi supabase/README.md).
//
// DUE MODALITÀ, scelte dal corpo della richiesta:
//   {}                       → promemoria al proprietario a -7 / -3 / -1 giorni
//   { "modo": "riepilogo" }  → riepilogo settimanale ai leader
//
// Quali rinnovi siano da avvisare NON lo decide questo file: lo decide
// `rinnovi_da_avvisare()` nel database. Così la regola è una sola, è la stessa
// per qualunque chiamante e si può verificare con una query.
//
// Il doppio invio è impossibile per costruzione: `renewal_reminders` ha come
// chiave primaria (renewal_id, offset_days), quindi una seconda esecuzione
// nello stesso giorno non aggiunge nulla e non manda nulla.
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono iniettati automaticamente
// nell'ambiente della function deployata.
// ============================================================================
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const LOTTO_EXPO = 100; // limite di messaggi per richiesta

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type DaAvvisare = {
  renewal_id: string;
  owner_id: string;
  prodotto: string | null;
  cliente: string | null;
  current_due_date: string;
  giorni_mancanti: number;
  offsets_coperti: number[];
};

type Riepilogo = {
  leader_id: string;
  in_scadenza: number;
  da_approvare: number;
};

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Variabili SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti.' }, 500);
  }

  let modo = 'promemoria';
  try {
    const body = await req.json();
    if (body?.modo === 'riepilogo') modo = 'riepilogo';
  } catch {
    // Nessun corpo: modalità predefinita.
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    return modo === 'riepilogo'
      ? await inviaRiepilogoLeader(supabase)
      : await inviaPromemoria(supabase);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore interno.' }, 500);
  }
});

// --- Promemoria al proprietario ---------------------------------------------

async function inviaPromemoria(supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase.rpc('rinnovi_da_avvisare');
  if (error) throw error;

  const dovuti = (data ?? []) as DaAvvisare[];
  if (dovuti.length === 0) return json({ modo: 'promemoria', rinnovi: 0, inviati: 0 });

  const tokenPerUtente = await caricaToken(
    supabase,
    dovuti.map((r) => r.owner_id),
  );

  const messaggi: ExpoMessage[] = [];
  for (const r of dovuti) {
    const token = tokenPerUtente.get(r.owner_id) ?? [];
    if (token.length === 0) continue;

    for (const to of token) {
      messaggi.push({
        to,
        title: titoloPromemoria(r.giorni_mancanti),
        body: corpoPromemoria(r),
        data: { renewalId: r.renewal_id },
      });
    }
  }

  await inviaPush(messaggi);

  // Registriamo TUTTI gli scaglioni coperti, anche quelli saltati dal cron:
  // altrimenti domani riemergerebbero e manderebbero un doppione.
  const righe = dovuti.flatMap((r) =>
    r.offsets_coperti.map((off) => ({ renewal_id: r.renewal_id, offset_days: off })),
  );
  if (righe.length > 0) {
    const { error: errIns } = await supabase
      .from('renewal_reminders')
      .upsert(righe, { onConflict: 'renewal_id,offset_days', ignoreDuplicates: true });
    if (errIns) throw errIns;
  }

  return json({ modo: 'promemoria', rinnovi: dovuti.length, inviati: messaggi.length });
}

function titoloPromemoria(giorni: number): string {
  if (giorni <= 0) return 'Rinnovo in scadenza oggi';
  if (giorni === 1) return 'Rinnovo in scadenza domani';
  return `Rinnovo tra ${giorni} giorni`;
}

function corpoPromemoria(r: DaAvvisare): string {
  const cosa = r.prodotto ?? 'Rinnovo';
  const chi = r.cliente ? ` — ${r.cliente}` : '';
  return `${cosa}${chi}: scade il ${formattaData(r.current_due_date)}.`;
}

// --- Riepilogo settimanale ai leader ----------------------------------------

async function inviaRiepilogoLeader(supabase: SupabaseClient): Promise<Response> {
  const { data, error } = await supabase.rpc('riepilogo_rinnovi_leader');
  if (error) throw error;

  const riepiloghi = (data ?? []) as Riepilogo[];
  if (riepiloghi.length === 0) return json({ modo: 'riepilogo', leader: 0, inviati: 0 });

  const tokenPerUtente = await caricaToken(
    supabase,
    riepiloghi.map((r) => r.leader_id),
  );

  const messaggi: ExpoMessage[] = [];
  for (const r of riepiloghi) {
    for (const to of tokenPerUtente.get(r.leader_id) ?? []) {
      messaggi.push({
        to,
        title: 'La tua rete questa settimana',
        body: corpoRiepilogo(r),
        data: { schermata: 'renewals' },
      });
    }
  }

  await inviaPush(messaggi);
  return json({ modo: 'riepilogo', leader: riepiloghi.length, inviati: messaggi.length });
}

function corpoRiepilogo(r: Riepilogo): string {
  const parti: string[] = [];
  if (r.da_approvare > 0) {
    parti.push(
      `${r.da_approvare} ${r.da_approvare === 1 ? 'rinnovo da approvare' : 'rinnovi da approvare'}`,
    );
  }
  if (r.in_scadenza > 0) {
    parti.push(`${r.in_scadenza} in scadenza entro 7 giorni`);
  }
  return `${parti.join(' · ')}.`;
}

// --- Utilità condivise ------------------------------------------------------

async function caricaToken(
  supabase: SupabaseClient,
  utenti: string[],
): Promise<Map<string, string[]>> {
  const unici = [...new Set(utenti)];
  const { data, error } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', unici);
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

/** `2026-08-15` → `15/08/2026`. */
function formattaData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
