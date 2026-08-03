/**
 * Test delle policy RLS: cosa vede davvero ciascun ruolo interrogando Postgres.
 *
 * `permissions.test.ts` verifica la regola scritta nell'app; questo verifica che
 * il database applichi la stessa regola. È il test che conta: nascondere un
 * pulsante non protegge un dato.
 *
 * COSA SERVE PER FARLI GIRARE
 *   1. Un progetto Supabase con le migrazioni 0001 → 0011 applicate
 *      (usa un progetto di prova, non quello di produzione: questi test scrivono).
 *   2. I tre utenti demo: node scripts/seed-demo-users.mjs
 *   3. Authentication → Email → «Confirm email» disattivato
 *   4. La service_role key nell'ambiente:
 *        $env:SUPABASE_SERVICE_ROLE_KEY="..."   (PowerShell)
 *        export SUPABASE_SERVICE_ROLE_KEY=...   (bash)
 *
 * URL e anon key vengono letti da .env (le stesse EXPO_PUBLIC_* dell'app).
 * Senza credenziali la suite si salta con un messaggio, invece di fallire.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// --- Credenziali ------------------------------------------------------------

/** Legge .env senza dipendenze aggiuntive (poche righe, formato KEY=VALUE). */
function leggiEnvFile(): Record<string, string> {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    const out: Record<string, string> = {};
    for (const riga of raw.split('\n')) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...leggiEnvFile(), ...process.env } as Record<string, string | undefined>;
const URL_SB = env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const configurato =
  Boolean(URL_SB && ANON && SERVICE) && !URL_SB!.includes('xxxx') && !ANON!.startsWith('inserisci');

const PASSWORD = 'Invisionary!23';
const EMAIL = {
  admin: 'admin@invisionary.demo',
  leader: 'leader@invisionary.demo',
  collaboratore: 'collab@invisionary.demo',
} as const;
type Ruolo = keyof typeof EMAIL;

// --- Suite ------------------------------------------------------------------

describe.skipIf(!configurato)('RLS — perimetro di lettura e scrittura per ruolo', () => {
  const client: Record<Ruolo, SupabaseClient> = {} as never;
  const id: Record<Ruolo, string> = {} as never;
  let admin: SupabaseClient; // service_role: scavalca la RLS, serve per i fixture
  let clienteDelCollaboratore: string;
  let clienteDellAdmin: string;

  beforeAll(async () => {
    admin = createClient(URL_SB!, SERVICE!, { auth: { persistSession: false } });

    // Un client autenticato per ciascun ruolo.
    for (const ruolo of Object.keys(EMAIL) as Ruolo[]) {
      const c = createClient(URL_SB!, ANON!, { auth: { persistSession: false } });
      const { data, error } = await c.auth.signInWithPassword({
        email: EMAIL[ruolo],
        password: PASSWORD,
      });
      if (error) {
        throw new Error(
          `Accesso fallito per ${EMAIL[ruolo]}: ${error.message}. ` +
            'Hai lanciato scripts/seed-demo-users.mjs e disattivato «Confirm email»?',
        );
      }
      client[ruolo] = c;
      id[ruolo] = data.user!.id;
    }

    // Gerarchia attesa dal seed: il collaboratore ha come leader il leader demo.
    const { data: p } = await admin
      .from('profiles')
      .select('leader_id')
      .eq('id', id.collaboratore)
      .single();
    expect(p?.leader_id, 'il collaboratore demo deve avere il leader demo').toBe(id.leader);

    // Fixture: un cliente del collaboratore e uno dell'admin.
    const ins = await admin
      .from('clients')
      .insert([
        { owner_id: id.collaboratore, nome: 'RLS Test — del collaboratore' },
        { owner_id: id.admin, nome: 'RLS Test — dell’admin' },
      ])
      .select('id, owner_id');
    if (ins.error) throw ins.error;
    clienteDelCollaboratore = ins.data.find((r) => r.owner_id === id.collaboratore)!.id;
    clienteDellAdmin = ins.data.find((r) => r.owner_id === id.admin)!.id;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from('clients').delete().like('nome', 'RLS Test —%');
    for (const c of Object.values(client)) await c?.auth.signOut();
  });

  // --- profiles -------------------------------------------------------------

  describe('profiles', () => {
    it('il collaboratore vede solo se stesso', async () => {
      const { data, error } = await client.collaboratore.from('profiles').select('id');
      expect(error).toBeNull();
      expect(data!.map((r) => r.id)).toEqual([id.collaboratore]);
    });

    it('il leader vede se stesso e i propri collaboratori, non l’admin', async () => {
      const { data, error } = await client.leader.from('profiles').select('id');
      expect(error).toBeNull();
      const visti = new Set(data!.map((r) => r.id));
      expect(visti.has(id.leader)).toBe(true);
      expect(visti.has(id.collaboratore)).toBe(true);
      expect(visti.has(id.admin)).toBe(false);
    });

    it('l’admin vede tutti e tre', async () => {
      const { data, error } = await client.admin.from('profiles').select('id');
      expect(error).toBeNull();
      const visti = new Set(data!.map((r) => r.id));
      for (const uid of Object.values(id)) expect(visti.has(uid)).toBe(true);
    });
  });

  // --- clients --------------------------------------------------------------

  describe('clients', () => {
    it('il collaboratore vede il proprio cliente e non quello dell’admin', async () => {
      const { data, error } = await client.collaboratore.from('clients').select('id');
      expect(error).toBeNull();
      const visti = new Set(data!.map((r) => r.id));
      expect(visti.has(clienteDelCollaboratore)).toBe(true);
      expect(visti.has(clienteDellAdmin)).toBe(false);
    });

    it('il leader vede il cliente del proprio collaboratore', async () => {
      const { data, error } = await client.leader.from('clients').select('id');
      expect(error).toBeNull();
      const visti = new Set(data!.map((r) => r.id));
      expect(visti.has(clienteDelCollaboratore)).toBe(true);
      expect(visti.has(clienteDellAdmin)).toBe(false);
    });

    it('l’admin vede entrambi', async () => {
      const { data, error } = await client.admin.from('clients').select('id');
      expect(error).toBeNull();
      const visti = new Set(data!.map((r) => r.id));
      expect(visti.has(clienteDelCollaboratore)).toBe(true);
      expect(visti.has(clienteDellAdmin)).toBe(true);
    });

    it('chiedere per id un cliente non autorizzato restituisce zero righe', async () => {
      const { data, error } = await client.collaboratore
        .from('clients')
        .select('id')
        .eq('id', clienteDellAdmin);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('il leader legge ma non modifica i clienti del collaboratore', async () => {
      // La RLS filtra: l'update non trova righe su cui agire.
      const { data, error } = await client.leader
        .from('clients')
        .update({ nome: 'Modificato dal leader' })
        .eq('id', clienteDelCollaboratore)
        .select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: dopo } = await admin
        .from('clients')
        .select('nome')
        .eq('id', clienteDelCollaboratore)
        .single();
      expect(dopo!.nome).toBe('RLS Test — del collaboratore');
    });

    it('nessuno può creare un cliente intestato a un altro', async () => {
      const { error } = await client.collaboratore
        .from('clients')
        .insert({ owner_id: id.leader, nome: 'RLS Test — intestazione altrui' });
      expect(error, 'la insert deve essere rifiutata dalla RLS').not.toBeNull();
    });
  });

  // --- renewals (scadenzario) ----------------------------------------------

  describe('renewals', () => {
    it('il collaboratore non vede i rinnovi altrui', async () => {
      const creato = await admin
        .from('renewals')
        .insert({ owner_id: id.admin, prodotto: 'RLS Test', scadenza: '2027-01-01' })
        .select('id')
        .single();
      if (creato.error) throw creato.error;

      const { data, error } = await client.collaboratore
        .from('renewals')
        .select('id')
        .eq('id', creato.data.id);
      // Nota: la RLS non solleva un errore in lettura, filtra le righe.
      // "Nessun dato" qui vale come "accesso negato".
      expect(error).toBeNull();
      expect(data).toEqual([]);

      await admin.from('renewals').delete().eq('id', creato.data.id);
    });
  });

  // --- escalation di privilegi ---------------------------------------------

  describe('anti escalation', () => {
    it('un collaboratore non riesce a promuoversi admin', async () => {
      await client.collaboratore.from('profiles').update({ role: 'admin' }).eq('id', id.collaboratore);

      const { data } = await admin
        .from('profiles')
        .select('role')
        .eq('id', id.collaboratore)
        .single();
      expect(data!.role, 'il trigger deve aver ripristinato il ruolo').toBe('collaboratore');
    });

    it('un collaboratore non riesce a cambiarsi il leader', async () => {
      await client.collaboratore
        .from('profiles')
        .update({ leader_id: null })
        .eq('id', id.collaboratore);

      const { data } = await admin
        .from('profiles')
        .select('leader_id')
        .eq('id', id.collaboratore)
        .single();
      expect(data!.leader_id).toBe(id.leader);
    });
  });
});

// Se manca la configurazione lo diciamo, così il silenzio non sembra un successo.
describe.skipIf(configurato)('RLS — non eseguiti', () => {
  it('mancano le credenziali: vedi le istruzioni in cima a tests/rls.test.ts', () => {
    console.warn(
      '\n⚠️  Test RLS saltati: servono EXPO_PUBLIC_SUPABASE_URL, ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY (da .env) e SUPABASE_SERVICE_ROLE_KEY (da ambiente).\n',
    );
    expect(configurato).toBe(false);
  });
});
