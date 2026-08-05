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

  // --- approvazione dei rinnovi --------------------------------------------

  describe('approvazione', () => {
    it('la modifica di un collaboratore diventa una richiesta, non una decisione', async () => {
      const creato = await admin
        .from('renewals')
        .insert({
          owner_id: id.collaboratore,
          prodotto: 'RLS Test approvazione',
          current_due_date: '2026-03-01',
          interval_days: 30,
          status: 'attivo',
        })
        .select('id')
        .single();
      if (creato.error) throw creato.error;
      const rid = creato.data.id;

      // Il collaboratore prova a spostarsi la scadenza e a dichiararla attiva.
      await client.collaboratore
        .from('renewals')
        .update({ current_due_date: '2026-12-31', status: 'attivo' })
        .eq('id', rid);

      const { data: dopo } = await admin
        .from('renewals')
        .select('status, requested_by, approved_by')
        .eq('id', rid)
        .single();

      expect(dopo!.status, 'il guardiano deve declassare la modifica a richiesta').toBe(
        'in_attesa_approvazione',
      );
      expect(dopo!.requested_by).toBe(id.collaboratore);
      expect(dopo!.approved_by, 'nessuno si auto-approva').toBeNull();

      await admin.from('renewals').delete().eq('id', rid);
    });

    it('il leader approva e il database registra chi e quando', async () => {
      const creato = await admin
        .from('renewals')
        .insert({
          owner_id: id.collaboratore,
          prodotto: 'RLS Test approvazione leader',
          current_due_date: '2026-03-01',
          interval_days: 30,
          status: 'in_attesa_approvazione',
        })
        .select('id')
        .single();
      if (creato.error) throw creato.error;
      const rid = creato.data.id;

      const { error } = await client.leader
        .from('renewals')
        .update({ current_due_date: '2026-03-31', status: 'attivo' })
        .eq('id', rid);
      expect(error).toBeNull();

      const { data: dopo } = await admin
        .from('renewals')
        .select('status, current_due_date, approved_by, approved_at')
        .eq('id', rid)
        .single();

      expect(dopo!.status).toBe('attivo');
      expect(dopo!.current_due_date).toBe('2026-03-31'); // +30 sulla scadenza, non su oggi
      expect(dopo!.approved_by, 'l’approvatore lo scrive il database').toBe(id.leader);
      expect(dopo!.approved_at).not.toBeNull();

      await admin.from('renewals').delete().eq('id', rid);
    });

    it('ogni transizione lascia una riga nello storico', async () => {
      const creato = await admin
        .from('renewals')
        .insert({
          owner_id: id.collaboratore,
          prodotto: 'RLS Test storico',
          current_due_date: '2026-05-01',
          interval_days: 30,
          status: 'attivo',
        })
        .select('id')
        .single();
      if (creato.error) throw creato.error;
      const rid = creato.data.id;

      await client.collaboratore
        .from('renewals')
        .update({ current_due_date: '2026-06-01' })
        .eq('id', rid);

      const { data: storico } = await admin
        .from('renewal_history')
        .select('action, actor_id')
        .eq('renewal_id', rid)
        .order('created_at');

      expect(storico!.map((r) => r.action)).toContain('creato');
      expect(storico!.map((r) => r.action)).toContain('rinnovo_richiesto');

      await admin.from('renewals').delete().eq('id', rid);
    });

    it('lo storico è di sola lettura anche per l’admin autenticato', async () => {
      const { error } = await client.admin
        .from('renewal_history')
        .insert({ renewal_id: crypto.randomUUID(), action: 'approvato' });
      expect(error, 'nessuno scrive lo storico a mano: lo scrivono i trigger').not.toBeNull();
    });
  });

  // --- promemoria -----------------------------------------------------------

  describe('promemoria', () => {
    /** Crea un rinnovo del collaboratore con scadenza fra `giorni` giorni. */
    async function rinnovoFraGiorni(giorni: number) {
      const d = new Date();
      d.setDate(d.getDate() + giorni);
      const iso = d.toISOString().slice(0, 10);
      const { data, error } = await admin
        .from('renewals')
        .insert({
          owner_id: id.collaboratore,
          prodotto: 'RLS Test promemoria',
          current_due_date: iso,
          interval_days: 30,
          status: 'attivo',
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    }

    it('un rinnovo lontano non è ancora da avvisare', async () => {
      const rid = await rinnovoFraGiorni(20);
      const { data, error } = await admin.rpc('rinnovi_da_avvisare');
      expect(error).toBeNull();
      expect((data as { renewal_id: string }[]).map((r) => r.renewal_id)).not.toContain(rid);
      await admin.from('renewals').delete().eq('id', rid);
    });

    it('a cinque giorni dalla scadenza è dovuto lo scaglione -7', async () => {
      const rid = await rinnovoFraGiorni(5);
      const { data } = await admin.rpc('rinnovi_da_avvisare');
      const riga = (data as { renewal_id: string; offsets_coperti: number[] }[]).find(
        (r) => r.renewal_id === rid,
      );
      expect(riga, 'deve comparire fra quelli da avvisare').toBeDefined();
      expect(riga!.offsets_coperti).toEqual([7]);
      await admin.from('renewals').delete().eq('id', rid);
    });

    it('registrato l’invio, non ricompare', async () => {
      const rid = await rinnovoFraGiorni(5);
      await admin.from('renewal_reminders').insert({ renewal_id: rid, offset_days: 7 });

      const { data } = await admin.rpc('rinnovi_da_avvisare');
      expect((data as { renewal_id: string }[]).map((r) => r.renewal_id)).not.toContain(rid);
      await admin.from('renewals').delete().eq('id', rid);
    });

    it('il doppio invio è impossibile: la chiave primaria lo rifiuta', async () => {
      const rid = await rinnovoFraGiorni(5);
      await admin.from('renewal_reminders').insert({ renewal_id: rid, offset_days: 7 });
      const { error } = await admin
        .from('renewal_reminders')
        .insert({ renewal_id: rid, offset_days: 7 });
      expect(error, 'la seconda insert deve essere rifiutata').not.toBeNull();
      await admin.from('renewals').delete().eq('id', rid);
    });

    it('spostare la scadenza fa ripartire il ciclo di avvisi', async () => {
      const rid = await rinnovoFraGiorni(5);
      await admin.from('renewal_reminders').insert({ renewal_id: rid, offset_days: 7 });

      const nuova = new Date();
      nuova.setDate(nuova.getDate() + 40);
      await admin
        .from('renewals')
        .update({ current_due_date: nuova.toISOString().slice(0, 10) })
        .eq('id', rid);

      const { data } = await admin
        .from('renewal_reminders')
        .select('offset_days')
        .eq('renewal_id', rid);
      expect(data, 'il trigger deve aver azzerato i promemoria').toEqual([]);
      await admin.from('renewals').delete().eq('id', rid);
    });

    it('un utente autenticato non può scrivere nei promemoria', async () => {
      const rid = await rinnovoFraGiorni(5);
      const { error } = await client.collaboratore
        .from('renewal_reminders')
        .insert({ renewal_id: rid, offset_days: 1 });
      expect(error, 'i promemoria li scrive solo la Edge Function').not.toBeNull();
      await admin.from('renewals').delete().eq('id', rid);
    });
  });

  // --- avanzamento formazione ----------------------------------------------

  describe('viste di avanzamento', () => {
    it('il collaboratore vede solo il proprio avanzamento', async () => {
      const { data, error } = await client.collaboratore
        .from('v_avanzamento_globale')
        .select('user_id');
      expect(error).toBeNull();
      expect(
        data!.map((r) => r.user_id),
        'security_invoker deve applicare la RLS di profiles',
      ).toEqual([id.collaboratore]);
    });

    it('il leader vede sé e i propri collaboratori, non l’admin', async () => {
      const { data, error } = await client.leader.from('v_avanzamento_globale').select('user_id');
      expect(error).toBeNull();
      const visti = new Set(data!.map((r) => r.user_id));
      expect(visti.has(id.leader)).toBe(true);
      expect(visti.has(id.collaboratore)).toBe(true);
      expect(visti.has(id.admin), 'la vista non deve scavalcare la RLS').toBe(false);
    });

    it('le percentuali sono coerenti con i conteggi', async () => {
      const { data } = await client.collaboratore
        .from('v_avanzamento_globale')
        .select('completate, totale, percentuale')
        .single();
      const atteso =
        data!.totale === 0 ? 0 : Math.round((data!.completate / data!.totale) * 100);
      expect(data!.percentuale).toBe(atteso);
    });

    it('nessuno può segnare una lezione per conto di un altro', async () => {
      const { data: lezione } = await admin.from('lessons').select('id').limit(1).maybeSingle();
      if (!lezione) return; // senza seed formativo non c'è nulla da provare

      // Il collaboratore prova a intestare il completamento al leader.
      await client.collaboratore
        .from('lesson_progress')
        .insert({ lesson_id: lezione.id, user_id: id.leader });

      const { data: righe } = await admin
        .from('lesson_progress')
        .select('user_id')
        .eq('lesson_id', lezione.id)
        .eq('user_id', id.leader);

      expect(righe, 'il guardiano riporta user_id a chi scrive').toEqual([]);

      await admin
        .from('lesson_progress')
        .delete()
        .eq('lesson_id', lezione.id)
        .eq('user_id', id.collaboratore);
    });
  });

  // --- rank -----------------------------------------------------------------

  describe('classifica', () => {
    it('la vista materializzata non è raggiungibile direttamente', async () => {
      // È il punto critico: Postgres non applica la RLS alle matview, quindi se
      // fosse leggibile mostrerebbe i punti di tutti. Deve essere negata.
      const { error } = await client.collaboratore.from('mv_rank_metriche').select('user_id');
      expect(error, 'la matview non deve essere accessibile agli utenti').not.toBeNull();
    });

    it('il collaboratore vede solo se stesso in classifica', async () => {
      const { data, error } = await client.collaboratore.rpc('classifica');
      expect(error).toBeNull();
      expect((data as { user_id: string }[]).map((r) => r.user_id)).toEqual([id.collaboratore]);
    });

    it('il leader vede sé e i propri collaboratori, non l’admin', async () => {
      const { data, error } = await client.leader.rpc('classifica');
      expect(error).toBeNull();
      const visti = new Set((data as { user_id: string }[]).map((r) => r.user_id));
      expect(visti.has(id.leader)).toBe(true);
      expect(visti.has(id.collaboratore)).toBe(true);
      expect(visti.has(id.admin), 'il filtro can_read_member è l’unica protezione qui').toBe(false);
    });

    it('è ordinata per punti decrescenti', async () => {
      const { data } = await client.admin.rpc('classifica');
      const punti = (data as { punti: number }[]).map((r) => Number(r.punti));
      const ordinati = [...punti].sort((a, b) => b - a);
      expect(punti).toEqual(ordinati);
    });

    it('cambiare un peso ricalcola i punti senza toccare il codice', async () => {
      // È la Definition of Done della milestone.
      const prima = await client.admin.rpc('classifica');
      const puntiPrima = Number(
        (prima.data as { user_id: string; punti: number }[]).find(
          (r) => r.user_id === id.collaboratore,
        )!.punti,
      );

      const { data: regola } = await admin
        .from('rank_rules')
        .select('id, points_per_unit')
        .eq('metric', 'lezioni_completate')
        .single();

      await admin
        .from('rank_rules')
        .update({ points_per_unit: Number(regola!.points_per_unit) + 100 })
        .eq('id', regola!.id);

      const dopo = await client.admin.rpc('classifica');
      const riga = (dopo.data as { user_id: string; punti: number; lezioni_completate: number }[]).find(
        (r) => r.user_id === id.collaboratore,
      )!;
      const atteso = puntiPrima + 100 * riga.lezioni_completate;
      expect(Number(riga.punti)).toBe(atteso);

      // Ripristino il peso originale.
      await admin
        .from('rank_rules')
        .update({ points_per_unit: regola!.points_per_unit })
        .eq('id', regola!.id);
    });

    it('solo l’admin modifica le regole del punteggio', async () => {
      const { data: regola } = await admin.from('rank_rules').select('id').limit(1).single();
      const { data: modificate } = await client.collaboratore
        .from('rank_rules')
        .update({ points_per_unit: 999 })
        .eq('id', regola!.id)
        .select('id');
      expect(modificate, 'la RLS filtra: nessuna riga aggiornata').toEqual([]);
    });

    it('le regole sono leggibili da tutti: il punteggio deve essere trasparente', async () => {
      const { data, error } = await client.collaboratore.from('rank_rules').select('metric');
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });
  });

  // --- classifica trader ----------------------------------------------------

  describe('classifica trader', () => {
    let contoId: string;

    /** Un'operazione chiusa: due deal legati dallo stesso position_id. */
    async function operazione(opts: {
      posizione: string;
      risultato: number;
      durataSecondi: number;
      giorniFa?: number;
    }) {
      const apertura = new Date();
      apertura.setDate(apertura.getDate() - (opts.giorniFa ?? 1));
      const chiusura = new Date(apertura.getTime() + opts.durataSecondi * 1000);

      const { error } = await admin.from('trades').insert([
        {
          account_id: contoId,
          owner_id: id.collaboratore,
          external_id: `RLSTEST-${opts.posizione}-in`,
          position_id: opts.posizione,
          entry_type: 'DEAL_ENTRY_IN',
          type: 'DEAL_TYPE_BUY',
          symbol: 'EURUSD',
          profit: 0,
          time: apertura.toISOString(),
        },
        {
          account_id: contoId,
          owner_id: id.collaboratore,
          external_id: `RLSTEST-${opts.posizione}-out`,
          position_id: opts.posizione,
          entry_type: 'DEAL_ENTRY_OUT',
          type: 'DEAL_TYPE_SELL',
          symbol: 'EURUSD',
          profit: opts.risultato,
          time: chiusura.toISOString(),
        },
      ]);
      if (error) throw error;
    }

    beforeAll(async () => {
      const { data, error } = await admin
        .from('trading_accounts')
        .insert({
          owner_id: id.collaboratore,
          name: 'RLS Test conto',
          provider: 'metaapi',
          metaapi_account_id: 'rls-test-account', // conto "verificato"
        })
        .select('id')
        .single();
      if (error) throw error;
      contoId = data.id;
    });

    afterAll(async () => {
      await admin.from('trades').delete().like('external_id', 'RLSTEST-%');
      if (contoId) await admin.from('trading_accounts').delete().eq('id', contoId);
    });

    it('ricompone le operazioni dai deal e ne calcola la durata', async () => {
      await operazione({ posizione: 'p-durata', risultato: 10, durataSecondi: 300 });

      const { data, error } = await admin
        .from('v_operazioni')
        .select('position_id, risultato, durata_secondi')
        .eq('position_id', 'p-durata')
        .single();

      expect(error).toBeNull();
      expect(Number(data!.risultato)).toBe(10);
      expect(Number(data!.durata_secondi)).toBe(300);
    });

    it('un’operazione ancora aperta non compare: manca il deal di uscita', async () => {
      await admin.from('trades').insert({
        account_id: contoId,
        owner_id: id.collaboratore,
        external_id: 'RLSTEST-aperta-in',
        position_id: 'p-aperta',
        entry_type: 'DEAL_ENTRY_IN',
        symbol: 'EURUSD',
        time: new Date().toISOString(),
      });

      const { data } = await admin
        .from('v_operazioni')
        .select('position_id')
        .eq('position_id', 'p-aperta');
      expect(data).toEqual([]);
    });

    it('sotto la soglia di operazioni si resta non classificati', async () => {
      // Poche operazioni, tutte vincenti: win rate 100% ma fuori classifica.
      const { data } = await client.admin.rpc('classifica_trader');
      const riga = (data as { user_id: string; classificato: boolean; operazioni: number }[]).find(
        (r) => r.user_id === id.collaboratore,
      );
      expect(riga).toBeDefined();
      expect(riga!.operazioni).toBeLessThan(20);
      expect(riga!.classificato, 'poche operazioni non fanno una classifica').toBe(false);
    });

    it('le operazioni sotto la durata minima non contano', async () => {
      const prima = await client.admin.rpc('classifica_trader');
      const opPrima = (prima.data as { user_id: string; operazioni: number }[]).find(
        (r) => r.user_id === id.collaboratore,
      )!.operazioni;

      // 30 secondi: sotto la soglia di 60, deve essere ignorata.
      await operazione({ posizione: 'p-veloce', risultato: 50, durataSecondi: 30 });

      const dopo = await client.admin.rpc('classifica_trader');
      const opDopo = (dopo.data as { user_id: string; operazioni: number }[]).find(
        (r) => r.user_id === id.collaboratore,
      )!.operazioni;

      expect(opDopo, 'lo scalping artificiale non deve gonfiare il conteggio').toBe(opPrima);
    });

    it('le operazioni di un conto non collegato non contano', async () => {
      const { data: conto } = await admin
        .from('trading_accounts')
        .insert({ owner_id: id.collaboratore, name: 'RLS Test non collegato' })
        .select('id')
        .single();

      const prima = await client.admin.rpc('classifica_trader');
      const opPrima = (prima.data as { user_id: string; operazioni: number }[]).find(
        (r) => r.user_id === id.collaboratore,
      )!.operazioni;

      const t0 = new Date();
      t0.setDate(t0.getDate() - 1);
      await admin.from('trades').insert([
        {
          account_id: conto!.id,
          owner_id: id.collaboratore,
          external_id: 'RLSTEST-manuale-in',
          position_id: 'p-manuale',
          entry_type: 'DEAL_ENTRY_IN',
          time: t0.toISOString(),
        },
        {
          account_id: conto!.id,
          owner_id: id.collaboratore,
          external_id: 'RLSTEST-manuale-out',
          position_id: 'p-manuale',
          entry_type: 'DEAL_ENTRY_OUT',
          profit: 999,
          time: new Date(t0.getTime() + 600_000).toISOString(),
        },
      ]);

      const dopo = await client.admin.rpc('classifica_trader');
      const opDopo = (dopo.data as { user_id: string; operazioni: number }[]).find(
        (r) => r.user_id === id.collaboratore,
      )!.operazioni;

      expect(opDopo, 'solo i conti verificati entrano in classifica').toBe(opPrima);

      await admin.from('trades').delete().like('external_id', 'RLSTEST-manuale-%');
      await admin.from('trading_accounts').delete().eq('id', conto!.id);
    });

    it('la classifica non espone importi né rendimenti', async () => {
      // È un vincolo di prodotto: verificarlo sulle colonne, non a occhio.
      const { data } = await client.admin.rpc('classifica_trader');
      const righe = data as Record<string, unknown>[];
      if (righe.length === 0) return;
      const colonne = Object.keys(righe[0]);
      for (const vietata of ['profit', 'netProfit', 'net_profit', 'balance', 'equity', 'return_pct']) {
        expect(colonne, `la classifica non deve esporre ${vietata}`).not.toContain(vietata);
      }
    });

    it('il collaboratore non può darsi il badge delle call VIP', async () => {
      await client.collaboratore
        .from('profiles')
        .update({ vip_call_host: true })
        .eq('id', id.collaboratore);

      const { data } = await admin
        .from('profiles')
        .select('vip_call_host')
        .eq('id', id.collaboratore)
        .single();
      expect(data!.vip_call_host, 'il trigger deve ripristinarlo').toBe(false);
    });

    it('un podio congelato non cambia se arrivano nuove operazioni', async () => {
      const mese = new Date();
      mese.setMonth(mese.getMonth() - 1, 1);
      const meseISO = mese.toISOString().slice(0, 10);

      await admin.from('leaderboard_snapshots').delete().eq('periodo', meseISO);
      await admin.from('leaderboard_snapshots').insert({
        periodo: meseISO,
        posizione: 1,
        user_id: id.collaboratore,
        win_rate: 75,
        trade_count: 40,
      });

      // Un secondo congelamento non deve sovrascrivere il primo.
      await admin.rpc('congela_podio', { mese: meseISO });

      const { data } = await admin
        .from('leaderboard_snapshots')
        .select('user_id, win_rate')
        .eq('periodo', meseISO)
        .eq('posizione', 1)
        .single();

      expect(Number(data!.win_rate), 'la storia non si riscrive').toBe(75);
      await admin.from('leaderboard_snapshots').delete().eq('periodo', meseISO);
    });
  });

  // --- storico degli stati del CRM ------------------------------------------

  describe('storico dei contatti', () => {
    it('creare un contatto registra la fase iniziale', async () => {
      const { data: c, error } = await admin
        .from('clients')
        .insert({ owner_id: id.collaboratore, nome: 'RLS Test — storico' })
        .select('id')
        .single();
      if (error) throw error;

      const { data: storico } = await admin
        .from('contact_status_history')
        .select('da_stato, a_stato')
        .eq('client_id', c.id);

      expect(storico).toHaveLength(1);
      expect(storico![0]).toMatchObject({ da_stato: null, a_stato: 'nuovo' });

      await admin.from('clients').delete().eq('id', c.id);
    });

    it('ogni passaggio di fase lascia una riga, con la fase di partenza', async () => {
      const { data: c } = await admin
        .from('clients')
        .insert({ owner_id: id.collaboratore, nome: 'RLS Test — passaggi' })
        .select('id')
        .single();

      await client.collaboratore.from('clients').update({ stato: 'contattato' }).eq('id', c!.id);
      await client.collaboratore.from('clients').update({ stato: 'appuntamento' }).eq('id', c!.id);

      const { data: storico } = await admin
        .from('contact_status_history')
        .select('da_stato, a_stato, actor_id')
        .eq('client_id', c!.id)
        .order('created_at');

      expect(storico!.map((r) => `${r.da_stato ?? '∅'}→${r.a_stato}`)).toEqual([
        '∅→nuovo',
        'nuovo→contattato',
        'contattato→appuntamento',
      ]);
      // L'autore del passaggio è chi ha scritto, non il proprietario del dato.
      expect(storico![1].actor_id).toBe(id.collaboratore);

      await admin.from('clients').delete().eq('id', c!.id);
    });

    it('modificare altri campi non sporca lo storico', async () => {
      const { data: c } = await admin
        .from('clients')
        .insert({ owner_id: id.collaboratore, nome: 'RLS Test — solo note' })
        .select('id')
        .single();

      await client.collaboratore.from('clients').update({ note: 'aggiornata' }).eq('id', c!.id);

      const { data: storico } = await admin
        .from('contact_status_history')
        .select('id')
        .eq('client_id', c!.id);
      expect(storico, 'solo i cambi di fase vanno registrati').toHaveLength(1);

      await admin.from('clients').delete().eq('id', c!.id);
    });

    it('cambiare fase aggiorna da sé la data di ultimo contatto', async () => {
      const vecchia = new Date();
      vecchia.setDate(vecchia.getDate() - 40);
      const { data: c } = await admin
        .from('clients')
        .insert({
          owner_id: id.collaboratore,
          nome: 'RLS Test — ultimo contatto',
          ultimo_contatto_at: vecchia.toISOString(),
        })
        .select('id')
        .single();

      await client.collaboratore.from('clients').update({ stato: 'contattato' }).eq('id', c!.id);

      const { data: dopo } = await admin
        .from('clients')
        .select('ultimo_contatto_at')
        .eq('id', c!.id)
        .single();

      const giorniFa =
        (Date.now() - new Date(dopo!.ultimo_contatto_at).getTime()) / 86_400_000;
      expect(giorniFa, 'cambiare fase È un contatto').toBeLessThan(1);

      await admin.from('clients').delete().eq('id', c!.id);
    });

    it('lo storico non si scrive né si modifica a mano', async () => {
      const { data: c } = await admin
        .from('clients')
        .insert({ owner_id: id.collaboratore, nome: 'RLS Test — sola lettura' })
        .select('id')
        .single();

      const { error } = await client.collaboratore
        .from('contact_status_history')
        .insert({ client_id: c!.id, a_stato: 'cliente' });
      expect(error, 'lo storico lo scrivono solo i trigger').not.toBeNull();

      await admin.from('clients').delete().eq('id', c!.id);
    });

    it('lo storico segue il perimetro del contatto', async () => {
      const { data: c } = await admin
        .from('clients')
        .insert({ owner_id: id.admin, nome: 'RLS Test — perimetro' })
        .select('id')
        .single();

      const { data: visto } = await client.collaboratore
        .from('contact_status_history')
        .select('id')
        .eq('client_id', c!.id);
      expect(visto, 'il contatto è dell’admin: il collaboratore non lo vede').toEqual([]);

      await admin.from('clients').delete().eq('id', c!.id);
    });
  });

  // --- consensi GDPR --------------------------------------------------------

  describe('consensi', () => {
    async function contattoDi(owner: string, nome: string) {
      const { data, error } = await admin
        .from('clients')
        .insert({ owner_id: owner, nome })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    }

    it('senza consenso registrato il contatto NON è raggiungibile', async () => {
      // È il vincolo che conta: l'assenza non è un sì.
      const cid = await contattoDi(id.collaboratore, 'RLS Test — senza consenso');

      const { data } = await client.collaboratore
        .from('contactable_by_email')
        .select('client_id')
        .eq('client_id', cid);
      expect(data, 'il silenzio non è consenso').toEqual([]);

      await admin.from('clients').delete().eq('id', cid);
    });

    it('un consenso negato non rende raggiungibili', async () => {
      const cid = await contattoDi(id.collaboratore, 'RLS Test — consenso negato');
      await admin.from('contact_consents').insert({
        client_id: cid,
        canale: 'email',
        valore: false,
        origine: 'manuale',
      });

      const { data } = await client.collaboratore
        .from('contactable_by_email')
        .select('client_id')
        .eq('client_id', cid);
      expect(data).toEqual([]);

      await admin.from('clients').delete().eq('id', cid);
    });

    it('il consenso vale solo per il canale su cui è stato dato', async () => {
      const cid = await contattoDi(id.collaboratore, 'RLS Test — un canale solo');
      await admin.from('contact_consents').insert({
        client_id: cid,
        canale: 'email',
        valore: true,
        origine: 'manuale',
      });

      const email = await client.collaboratore
        .from('contactable_by_email')
        .select('client_id')
        .eq('client_id', cid);
      const sms = await client.collaboratore
        .from('contactable_by_sms')
        .select('client_id')
        .eq('client_id', cid);

      expect(email.data, 'ha detto sì all’email').toHaveLength(1);
      expect(sms.data, 'non ha mai detto sì agli SMS').toEqual([]);

      await admin.from('clients').delete().eq('id', cid);
    });

    it('revocare il consenso toglie subito dalla lista dei raggiungibili', async () => {
      const cid = await contattoDi(id.collaboratore, 'RLS Test — revoca');
      await admin.from('contact_consents').insert({
        client_id: cid,
        canale: 'email',
        valore: true,
        origine: 'manuale',
      });

      await client.collaboratore
        .from('contact_consents')
        .update({ valore: false })
        .eq('client_id', cid)
        .eq('canale', 'email');

      const { data } = await client.collaboratore
        .from('contactable_by_email')
        .select('client_id')
        .eq('client_id', cid);
      expect(data).toEqual([]);

      await admin.from('clients').delete().eq('id', cid);
    });

    it('ogni consenso lascia una prova nello storico', async () => {
      const cid = await contattoDi(id.collaboratore, 'RLS Test — prova');
      await client.collaboratore.from('contact_consents').insert({
        client_id: cid,
        canale: 'whatsapp',
        valore: true,
        origine: 'manuale',
        testo_informativa: 'Testo mostrato alla persona',
      });
      await client.collaboratore
        .from('contact_consents')
        .update({ valore: false })
        .eq('client_id', cid)
        .eq('canale', 'whatsapp');

      const { data: storia } = await admin
        .from('consent_history')
        .select('valore, testo_informativa, actor_id')
        .eq('client_id', cid)
        .order('created_at');

      expect(storia!.map((r) => r.valore), 'dato e poi revocato').toEqual([true, false]);
      expect(storia![0].testo_informativa, 'va salvato COSA ha accettato').toBe(
        'Testo mostrato alla persona',
      );
      expect(storia![0].actor_id).toBe(id.collaboratore);

      await admin.from('clients').delete().eq('id', cid);
    });

    it('un leader legge i consensi della rete ma non li dichiara al posto altrui', async () => {
      const cid = await contattoDi(id.collaboratore, 'RLS Test — firma altrui');
      await admin.from('contact_consents').insert({
        client_id: cid,
        canale: 'email',
        valore: false,
        origine: 'manuale',
      });

      const lettura = await client.leader
        .from('contact_consents')
        .select('valore')
        .eq('client_id', cid);
      expect(lettura.data, 'il leader vede la rete').toHaveLength(1);

      const { data: modificate } = await client.leader
        .from('contact_consents')
        .update({ valore: true })
        .eq('client_id', cid)
        .select('id');
      expect(modificate, 'un consenso è una firma: non la mette un altro').toEqual([]);

      await admin.from('clients').delete().eq('id', cid);
    });

    it('l’export raccoglie contatto, consensi e storici', async () => {
      const cid = await contattoDi(id.collaboratore, 'RLS Test — export');
      await admin.from('contact_consents').insert({
        client_id: cid,
        canale: 'email',
        valore: true,
        origine: 'manuale',
      });

      const { data, error } = await client.collaboratore.rpc('export_contact_data', {
        contact_id: cid,
      });
      expect(error).toBeNull();
      const dump = data as Record<string, unknown>;
      expect(Object.keys(dump)).toEqual(
        expect.arrayContaining(['contatto', 'consensi', 'storico_consensi', 'storico_fasi', 'rinnovi']),
      );
      expect((dump.consensi as unknown[]).length).toBe(1);

      await admin.from('clients').delete().eq('id', cid);
    });

    it('l’export non esce dal perimetro', async () => {
      const cid = await contattoDi(id.admin, 'RLS Test — export altrui');
      const { data } = await client.collaboratore.rpc('export_contact_data', { contact_id: cid });
      expect(data, 'non è un suo contatto').toBeNull();
      await admin.from('clients').delete().eq('id', cid);
    });

    it('la cancellazione porta via tutto e lascia solo la traccia', async () => {
      const cid = await contattoDi(id.collaboratore, 'RLS Test — cancellazione');
      await admin.from('contact_consents').insert({
        client_id: cid,
        canale: 'email',
        valore: true,
        origine: 'manuale',
      });

      const { data: esito, error } = await client.collaboratore.rpc('delete_contact_data', {
        contact_id: cid,
        motivo: 'richiesta dell’interessato',
      });
      expect(error).toBeNull();
      expect(esito).toBe(true);

      const contatto = await admin.from('clients').select('id').eq('id', cid);
      const consensi = await admin.from('contact_consents').select('id').eq('client_id', cid);
      expect(contatto.data, 'il contatto sparisce').toEqual([]);
      expect(consensi.data, 'i consensi cadono in cascata').toEqual([]);

      const { data: registro } = await admin
        .from('deletion_log')
        .select('entita, motivo')
        .eq('entita_id', cid)
        .single();
      expect(registro!.entita).toBe('client');
      expect(registro!.motivo).toBe('richiesta dell’interessato');
    });

    it('non si cancellano i contatti di altri', async () => {
      const cid = await contattoDi(id.admin, 'RLS Test — cancellazione altrui');
      const { error } = await client.collaboratore.rpc('delete_contact_data', { contact_id: cid });
      expect(error, 'deve rifiutare, non ignorare').not.toBeNull();

      const { data } = await admin.from('clients').select('id').eq('id', cid);
      expect(data, 'il contatto è ancora lì').toHaveLength(1);

      await admin.from('clients').delete().eq('id', cid);
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
