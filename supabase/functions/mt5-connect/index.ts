// ============================================================================
// Edge Function (Deno) — Collega un account MT5 read-only via MetaApi.
// L'utente fornisce login + INVESTOR password + server. La password passa a
// MetaApi e NON viene salvata da noi (memorizziamo solo il metaapi_account_id).
// Secret: METAAPI_TOKEN.
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { createAccount, deployAccount } from '../_shared/metaapi.ts';

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

    const body = await req.json();
    const login = String(body?.login ?? '').trim();
    const password = String(body?.password ?? '');
    const server = String(body?.server ?? '').trim();
    const platform: 'mt4' | 'mt5' = body?.platform === 'mt4' ? 'mt4' : 'mt5';
    const region = 'new-york';
    if (!login || !password || !server) {
      return json({ error: 'login, investor password e server sono richiesti.' }, 400);
    }

    const name = `${login}@${server}`;
    const account = await createAccount({ name, login, password, server, platform, region });
    try {
      await deployAccount(account.id);
    } catch {
      // il deploy può ritardare; la sincronizzazione avverrà quando l'account è pronto
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await admin
      .from('trading_accounts')
      .insert({
        owner_id: user.id,
        provider: 'metaapi',
        login,
        server,
        platform,
        region,
        name,
        metaapi_account_id: account.id,
        state: account.state ?? 'DEPLOYING',
      })
      .select('id')
      .single();
    if (error) throw error;

    return json({ id: data.id, metaapi_account_id: account.id, state: account.state });
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
