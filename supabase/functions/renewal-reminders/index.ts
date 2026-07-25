// ============================================================================
// Edge Function (Deno) — Invia avvisi push per i rinnovi in scadenza.
// Da schedulare via cron (vedi supabase/README.md).
//
// Per ogni rinnovo `active` con reminder_sent_at NULL la cui data di scadenza
// è entro `alert_days_before` giorni, invia una push Expo agli owner e marca
// reminder_sent_at per non ripetere l'avviso.
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono iniettati automaticamente
// nell'ambiente della function deployata.
// ============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Variabili SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti.' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: renewals, error } = await supabase
    .from('renewals')
    .select('id, owner_id, prodotto, scadenza, alert_days_before, client:clients(nome)')
    .eq('status', 'active')
    .is('reminder_sent_at', null);

  if (error) return json({ error: error.message }, 500);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const due = (renewals ?? []).filter((r) => {
    const scad = new Date(`${r.scadenza}T00:00:00Z`);
    const alertDate = new Date(scad);
    alertDate.setUTCDate(scad.getUTCDate() - (r.alert_days_before ?? 30));
    return today.getTime() >= alertDate.getTime();
  });

  if (due.length === 0) return json({ processed: 0, sent: 0 });

  // Token push per owner
  const ownerIds = [...new Set(due.map((r) => r.owner_id))];
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', ownerIds);

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t.token);
    tokensByUser.set(t.user_id, list);
  }

  const messages: ExpoMessage[] = [];
  const sentIds: string[] = [];

  for (const r of due) {
    const client = Array.isArray(r.client) ? r.client[0] : r.client;
    const clienteNome = client?.nome ? ` (${client.nome})` : '';
    const prodotto = r.prodotto ?? 'Rinnovo';
    for (const to of tokensByUser.get(r.owner_id) ?? []) {
      messages.push({
        to,
        title: 'Rinnovo in scadenza',
        body: `${prodotto}${clienteNome} scade il ${r.scadenza}.`,
        data: { renewalId: r.id },
      });
    }
    sentIds.push(r.id); // marca comunque per non riprovare all'infinito
  }

  // Invio push a lotti di 100 (limite Expo)
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    if (batch.length === 0) continue;
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
  }

  if (sentIds.length > 0) {
    await supabase
      .from('renewals')
      .update({ reminder_sent_at: new Date().toISOString() })
      .in('id', sentIds);
  }

  return json({ processed: due.length, sent: messages.length });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
