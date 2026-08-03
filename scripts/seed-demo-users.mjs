// ============================================================================
// Seed 3 utenti demo Invisionary (uno per ruolo) + gerarchia leader→collaboratore.
//
// Usa la SERVICE ROLE KEY: eseguire SOLO in locale, MAI nell'app.
// La chiave NON va committata né messa nel .env dell'app (che è client-side).
//
// Uso (PowerShell):
//   $env:SUPABASE_URL="https://xxxx.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
//   node scripts/seed-demo-users.mjs
//
// Prerequisito: aver applicato la migrazione supabase/migrations/0001_init.sql.
// Idempotente: se gli utenti esistono già, ne aggiorna solo ruolo/gerarchia.
// ============================================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Imposta le variabili SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = 'Invisionary!23';
const DEMO = [
  { role: 'admin', email: 'admin@invisionary.demo', full_name: 'Admin Demo' },
  { role: 'leader', email: 'leader@invisionary.demo', full_name: 'Leader Demo' },
  { role: 'collaboratore', email: 'collab@invisionary.demo', full_name: 'Collaboratore Demo' },
];

async function findUserByEmail(email) {
  // Pagina la lista utenti finché trova la corrispondenza.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser({ email, full_name }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (!error) return data.user;
  if (/already|registered|exists/i.test(error.message)) {
    const existing = await findUserByEmail(email);
    if (existing) return existing;
  }
  throw error;
}

async function main() {
  const ids = {};
  for (const u of DEMO) {
    const user = await ensureUser(u);
    ids[u.role] = user.id;
    console.log(`✓ ${u.role.padEnd(13)} ${u.email} → ${user.id}`);
  }

  // Imposta ruoli e gerarchia (service role: bypassa la RLS).
  const updates = [
    supabase.from('profiles').update({ full_name: 'Admin Demo', role: 'admin' }).eq('id', ids.admin),
    supabase.from('profiles').update({ full_name: 'Leader Demo', role: 'leader' }).eq('id', ids.leader),
    supabase
      .from('profiles')
      .update({ full_name: 'Collaboratore Demo', role: 'collaboratore', leader_id: ids.leader })
      .eq('id', ids.collaboratore),
  ];
  for (const p of updates) {
    const { error } = await p;
    if (error) throw error;
  }

  console.log('\n✅ Seed completato. Credenziali demo (password comune):');
  console.table(DEMO.map((u) => ({ ruolo: u.role, email: u.email, password: PASSWORD })));
}

main().catch((e) => {
  console.error('❌ Seed fallito:', e.message ?? e);
  process.exit(1);
});
