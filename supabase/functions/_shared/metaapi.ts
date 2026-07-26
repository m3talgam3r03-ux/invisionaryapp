// Client REST MetaApi (read-only). Secret: METAAPI_TOKEN (mai nel client).
// Endpoint verificati su metaapi.cloud/docs.
const PROVISIONING = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
const clientBase = (region: string) => `https://mt-client-api-v1.${region}.agiliumtrade.ai`;

function token(): string {
  const t = Deno.env.get('METAAPI_TOKEN');
  if (!t) throw new Error('METAAPI_TOKEN mancante');
  return t;
}
const txId = () => crypto.randomUUID().replace(/-/g, ''); // transaction-id 32 char

async function req(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { 'auth-token': token(), Accept: 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`MetaApi ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : await res.json();
}

/** Crea un account MetaTrader (login + investor password + server). Ritorna { id, state }. */
export async function createAccount(p: {
  name: string;
  login: string;
  password: string;
  server: string;
  platform: 'mt4' | 'mt5';
  region: string;
}): Promise<{ id: string; state: string }> {
  return (await req(`${PROVISIONING}/users/current/accounts`, {
    method: 'POST',
    headers: { 'transaction-id': txId(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: p.name,
      login: p.login,
      password: p.password,
      server: p.server,
      platform: p.platform,
      region: p.region,
      magic: 0,
      type: 'cloud-g2',
    }),
  })) as { id: string; state: string };
}

export async function deployAccount(id: string): Promise<void> {
  await req(`${PROVISIONING}/users/current/accounts/${id}/deploy`, {
    method: 'POST',
    headers: { 'transaction-id': txId() },
  });
}

export async function getAccountInformation(region: string, id: string): Promise<Record<string, unknown>> {
  return (await req(`${clientBase(region)}/users/current/accounts/${id}/account-information`, {
    method: 'GET',
  })) as Record<string, unknown>;
}

/** Deal storici in un intervallo (ISO 8601). */
export async function getDeals(
  region: string,
  id: string,
  startISO: string,
  endISO: string,
): Promise<Array<Record<string, unknown>>> {
  const url = `${clientBase(region)}/users/current/accounts/${id}/history-deals/time/${encodeURIComponent(
    startISO,
  )}/${encodeURIComponent(endISO)}?limit=1000`;
  const data = (await req(url, { method: 'GET' })) as unknown;
  return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
}
