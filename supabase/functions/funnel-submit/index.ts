// ============================================================================
// Edge Function (Deno) — Ricezione contatti dai funnel pubblici.
//
// ⚠️ QUESTA È L'UNICA FUNCTION CHIAMABILE SENZA LOGIN. Va deployata con
// `--no-verify-jwt`, altrimenti una pagina pubblica non può parlarle:
//
//     npx supabase functions deploy funnel-submit --no-verify-jwt
//
// Il che significa che tutto ciò che sta qui dentro è esposto a internet, e va
// trattato di conseguenza:
//
// · NON si accetta un `owner_id` dal client. Il proprietario del contatto lo
//   decide il funnel, lato database. Se lo passasse chi invia, chiunque
//   potrebbe scrivere nel CRM di chiunque altro.
// · NON si accetta il testo del consenso dal client, per lo stesso motivo:
//   sarebbe una prova scritta dall'imputato.
// · L'IP NON si salva in chiaro. È un dato personale, e per limitare gli abusi
//   basta un'impronta: si sala e si tronca.
// · Il limite orario e la deduplica stanno nel DATABASE (`registra_lead`), non
//   qui: due richieste simultanee devono trovare lo stesso stato.
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CANALI = ['email', 'sms', 'whatsapp', 'telefono'];
/** Tre secondi: pochi per una persona, un'eternità per un robot. */
const TEMPO_MINIMO_MS = 3000;

const CORS = {
  // La pagina del funnel può stare su un dominio diverso dall'app.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  /*
   * GET: cosa mostrare sulla pagina.
   *
   * Sta qui e non su PostgREST perché così la pagina pubblica non deve
   * portarsi dietro NESSUNA chiave. La anon key sarebbe pubblica per
   * definizione e protetta dalla RLS, ma un file HTML che gira per host
   * diversi con una chiave dentro è una cosa in più da ricordare, ruotare e
   * spiegare. Un solo indirizzo da configurare è meglio di un indirizzo e una
   * chiave.
   */
  if (req.method === 'GET') {
    try {
      const slug = new URL(req.url).searchParams.get('slug')?.trim().toLowerCase() ?? '';
      if (slug === '') return json({ error: 'Funnel non indicato.' }, 400);

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data, error } = await supabase.rpc('funnel_pubblico', { p_slug: slug });
      if (error) throw error;

      const f = (data ?? [])[0];
      // Un funnel spento o inesistente si racconta allo stesso modo: dire
      // «questo slug non esiste» permetterebbe di scoprirli per tentativi.
      if (!f) return json({ error: 'Funnel non disponibile.' }, 404);

      // Esce SOLO ciò che serve a disegnare il modulo: mai chi riceve i
      // contatti, mai i limiti configurati.
      return json({
        titolo: f.titolo,
        sottotitolo: f.sottotitolo,
        testoConsenso: f.testo_consenso,
        canali: f.canali,
      });
    } catch (e) {
      console.error('funnel-submit GET:', e instanceof Error ? e.message : e);
      return json({ error: 'Non è stato possibile caricare la pagina.' }, 500);
    }
  }

  if (req.method !== 'POST') return json({ error: 'Metodo non ammesso.' }, 405);

  try {
    const body = await req.json();

    // 1. I filtri anti-robot, prima di toccare il database.
    //
    //    Si risponde 200 e non un errore: a un robot non si spiega cosa ha
    //    sbagliato, altrimenti impara a evitarlo. Chi invia in buona fede non
    //    finisce mai qui.
    if (typeof body?.civetta === 'string' && body.civetta.trim() !== '') {
      return json({ ok: true });
    }
    if (Number(body?.tempoCompilazione ?? 0) < TEMPO_MINIMO_MS) {
      return json({ ok: true });
    }

    const slug = String(body?.slug ?? '').trim().toLowerCase();
    if (slug === '') return json({ error: 'Funnel non indicato.' }, 400);

    // 2. Solo i canali noti, e solo quelli davvero spuntati. Quali siano
    //    ammessi per QUESTO funnel lo verifica il database: qui si scarta solo
    //    ciò che non è nemmeno un canale.
    const canali = Array.isArray(body?.canali)
      ? body.canali.filter((c: unknown) => typeof c === 'string' && CANALI.includes(c))
      : [];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.rpc('registra_lead', {
      p_slug: slug,
      p_nome: String(body?.nome ?? ''),
      p_email: String(body?.email ?? ''),
      p_telefono: String(body?.telefono ?? ''),
      p_canali: canali,
      p_ip_hash: await improntaIp(req),
    });

    if (error) {
      const codice = (error as { code?: string }).code;
      // Il funnel che non esiste si racconta come «non disponibile»: dire
      // «questo slug non esiste» permetterebbe di scoprirli per tentativi.
      if (codice === 'P0004') return json({ error: 'Funnel non disponibile.' }, 404);
      if (codice === 'P0005') return json({ error: 'Troppe richieste. Riprova più tardi.' }, 429);
      if (codice === 'P0006') return json({ error: 'Servono un’email o un numero.' }, 400);
      throw error;
    }

    return json({ ok: true, id: data });
  } catch (e) {
    console.error('funnel-submit:', e instanceof Error ? e.message : e);
    // Il dettaglio resta nei log: a una pagina pubblica non si racconta com'è
    // fatto il database.
    return json({ error: 'Non è stato possibile registrare la richiesta.' }, 500);
  }
});

/**
 * Un'impronta dell'IP, non l'IP.
 *
 * Serve a contare gli abusi, non a identificare qualcuno: si sala con un
 * segreto e si tronca. Senza sale, un hash di un IPv4 si inverte in pochi
 * secondi — sono quattro miliardi di possibilità, non un numero grande.
 */
async function improntaIp(req: Request): Promise<string | null> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    null;
  if (!ip) return null;

  const sale = Deno.env.get('FUNNEL_IP_SALT');
  // Senza sale è meglio non salvare niente che salvare qualcosa di
  // reversibile: il limite orario per funnel regge comunque.
  if (!sale) return null;

  const dati = new TextEncoder().encode(`${sale}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', dati);
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
