// ============================================================================
// Edge Function (Deno) — Aggiorna la cache dei cambi.
// Da schedulare via cron ogni ora (vedi supabase/README.md).
//
// PERCHÉ ESISTE
// Il calcolatore di lottaggio deve convertire il valore del pip dalla valuta di
// quotazione a quella del conto. Interrogare il fornitore a ogni calcolo
// sarebbe lento, costoso e fragile: qui i cambi si scrivono in `fx_rates` e
// l'app legge sempre da lì.
//
// LA REGOLA: NON BLOCCARE MAI IL CALCOLATORE.
// Se il fornitore non risponde, questa function non tocca nulla e l'app
// continua con l'ultimo valore noto, mostrando di quando è. Un tasso di
// un'ora fa è molto meglio di un calcolatore che non calcola: chi deve aprire
// una posizione la aprirebbe comunque, a occhio.
//
// Fornitore: open.er-api.com — gratuito e senza chiave. Se un domani servisse
// un fornitore a pagamento, cambia solo `scaricaCambi()`.
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

/** Valute che ci interessano: quelle di quotazione degli strumenti + i conti. */
const VALUTE = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD'];

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Variabili SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti.' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const righe: { base: string; quote: string; rate: number; fetched_at: string }[] = [];
  const falliti: string[] = [];
  const adesso = new Date().toISOString();

  for (const base of VALUTE) {
    try {
      const tassi = await scaricaCambi(base);
      for (const quote of VALUTE) {
        if (quote === base) continue;
        const r = tassi[quote];
        if (typeof r === 'number' && r > 0) {
          righe.push({ base, quote, rate: r, fetched_at: adesso });
        }
      }
    } catch {
      // Una valuta fallita non deve far fallire le altre: si registra e si va
      // avanti. Le coppie mancanti restano al valore precedente.
      falliti.push(base);
    }
  }

  if (righe.length > 0) {
    const { error } = await supabase
      .from('fx_rates')
      .upsert(righe, { onConflict: 'base,quote' });
    if (error) return json({ error: error.message }, 500);
  }

  return json({ aggiornate: righe.length, falliti });
});

/** Cambi con base indicata. Restituisce una mappa valuta → tasso. */
async function scaricaCambi(base: string): Promise<Record<string, number>> {
  const risposta = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
    headers: { Accept: 'application/json' },
  });
  if (!risposta.ok) {
    throw new Error(`Fornitore cambi: HTTP ${risposta.status}`);
  }
  const dati = (await risposta.json()) as { result?: string; rates?: Record<string, number> };
  if (dati.result !== 'success' || !dati.rates) {
    throw new Error('Risposta del fornitore cambi non utilizzabile.');
  }
  return dati.rates;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
