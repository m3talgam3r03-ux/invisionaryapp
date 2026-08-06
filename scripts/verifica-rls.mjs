#!/usr/bin/env node
/**
 * Prepara ed esegue la verifica delle policy RLS su un progetto di prova.
 *
 * PERCHÉ ESISTE
 * I test in `tests/rls.test.ts` sono l'unica prova che il database applichi
 * davvero le regole che l'app dichiara: nascondere un pulsante non protegge un
 * dato. Ma non partono senza un progetto Supabase, e finora nessuno li ha mai
 * eseguiti. Questo script toglie ogni scusa: controlla i prerequisiti, dice
 * esattamente cosa manca, e lancia la suite.
 *
 * NON TOCCA IL PROGETTO DI PRODUZIONE. I test scrivono: si usa un progetto di
 * prova, e lo script si rifiuta di partire se l'URL è lo stesso che l'app usa
 * per il pubblico (a meno di --forza, che va usato sapendo cosa si fa).
 *
 *   node scripts/verifica-rls.mjs            controlla e, se è tutto pronto, esegue
 *   node scripts/verifica-rls.mjs --solo-check   controlla e basta
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const soloCheck = process.argv.includes('--solo-check');
const forza = process.argv.includes('--forza');

function leggiEnv() {
  try {
    const raw = readFileSync(join(RADICE, '.env'), 'utf8');
    const out = {};
    for (const riga of raw.split('\n')) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...leggiEnv(), ...process.env };
const segnaposto = (v) => !v || /YOUR-|xxxx|inserisci|<.*>|CHANGE.?ME/i.test(v);

const problemi = [];

// 1. Credenziali
if (segnaposto(env.EXPO_PUBLIC_SUPABASE_URL)) {
  problemi.push(
    'EXPO_PUBLIC_SUPABASE_URL manca o è ancora il segnaposto.\n' +
      '  → Crea un progetto Supabase di PROVA in regione EU e mettilo in .env',
  );
}
if (segnaposto(env.EXPO_PUBLIC_SUPABASE_ANON_KEY)) {
  problemi.push('EXPO_PUBLIC_SUPABASE_ANON_KEY manca o è ancora il segnaposto (.env).');
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  problemi.push(
    'SUPABASE_SERVICE_ROLE_KEY non è nell’ambiente.\n' +
      '  → PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY="..."\n' +
      '  → bash:        export SUPABASE_SERVICE_ROLE_KEY=...\n' +
      '  NON metterla in .env: quel file finisce nel bundle dell’app.',
  );
}

// 2. Le migrazioni che devono essere applicate, elencate per non doverle ricordare
const migrazioni = readdirSync(join(RADICE, 'supabase', 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log('\n── Verifica delle policy RLS ──\n');
console.log(`Migrazioni da applicare sul progetto di prova (${migrazioni.length}):`);
for (const m of migrazioni) console.log(`  · supabase/migrations/${m}`);
console.log('\nPoi:');
console.log('  · node scripts/seed-demo-users.mjs        crea i tre utenti demo');
console.log('  · Authentication → Email → «Confirm email» DISATTIVATO\n');

if (problemi.length > 0) {
  console.log('Manca ancora qualcosa:\n');
  for (const p of problemi) console.log(`  ✗ ${p}\n`);
  console.log('Sistema questi punti e rilancia.\n');
  process.exit(1);
}

// 3. Rete di sicurezza: non sul progetto di produzione
const urlProduzione = env.SUPABASE_URL_PRODUZIONE;
if (urlProduzione && urlProduzione === env.EXPO_PUBLIC_SUPABASE_URL && !forza) {
  console.log(
    '✗ L’URL coincide con quello indicato come produzione. Questi test SCRIVONO.\n' +
      '  Usa un progetto di prova, oppure --forza se sai cosa stai facendo.\n',
  );
  process.exit(1);
}

console.log('✓ Credenziali presenti.');
console.log(`  Progetto: ${env.EXPO_PUBLIC_SUPABASE_URL}`);
console.log('  ⚠️  I test scrivono su questo progetto. Deve essere quello di prova.\n');

if (soloCheck) {
  console.log('Solo controllo richiesto: non eseguo i test.\n');
  process.exit(0);
}

console.log('Eseguo tests/rls.test.ts…\n');
try {
  execSync('npx vitest run tests/rls.test.ts', { cwd: RADICE, stdio: 'inherit' });
} catch {
  console.log(
    '\nQualche test è fallito. Non è un difetto dello script: è il database che\n' +
      'si comporta diversamente da come l’app dichiara. Va letto uno per uno.\n',
  );
  process.exit(1);
}
