// ============================================================================
// Edge Function (Deno) — Sincronizza gli account MT5 del chiamante da MetaApi.
// Aggiorna saldo/equity e importa i deal (read-only) nella tabella trades.
// Secret: METAAPI_TOKEN.
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { getAccountInformation, getDeals } from '../_shared/metaapi.ts';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Non autenticato.' }, 401);

    const body = await req.json().catch(() => ({}));
    const onlyId: string | undefined = body?.accountId;

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let query = admin.from('trading_accounts').select('*').eq('owner_id', user.id);
    if (onlyId) query = query.eq('id', onlyId);
    const { data: accounts, error } = await query;
    if (error) throw error;

    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - 180);

    let synced = 0;
    for (const a of accounts ?? []) {
      if (!a.metaapi_account_id) continue;
      const region = a.region ?? 'new-york';
      try {
        const info = await getAccountInformation(region, a.metaapi_account_id);
        const deals = await getDeals(region, a.metaapi_account_id, start.toISOString(), end.toISOString());

        const rows = deals
          .filter((d) => {
            const t = String(d.type ?? '');
            return t === 'DEAL_TYPE_BUY' || t === 'DEAL_TYPE_SELL';
          })
          .map((d) => ({
            account_id: a.id,
            owner_id: a.owner_id,
            external_id: String(d.id),
            symbol: (d.symbol as string) ?? null,
            type: (d.type as string) ?? null,
            volume: (d.volume as number) ?? null,
            price: (d.price as number) ?? null,
            profit: (d.profit as number) ?? null,
            commission: (d.commission as number) ?? null,
            swap: (d.swap as number) ?? null,
            entry_type: (d.entryType as string) ?? null,
            time: (d.time as string) ?? null,
          }));

        if (rows.length > 0) {
          const { error: upErr } = await admin
            .from('trades')
            .upsert(rows, { onConflict: 'account_id,external_id' });
          if (upErr) throw upErr;
        }

        await admin
          .from('trading_accounts')
          .update({
            balance: (info.balance as number) ?? null,
            equity: (info.equity as number) ?? null,
            currency: (info.currency as string) ?? null,
            state: 'DEPLOYED',
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', a.id);
        synced++;
      } catch (e) {
        // Account non ancora connesso o errore MetaApi: segna lo stato e continua.
        await admin
          .from('trading_accounts')
          .update({ state: e instanceof Error ? e.message.slice(0, 120) : 'ERROR' })
          .eq('id', a.id);
      }
    }

    return json({ synced });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore interno.' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
