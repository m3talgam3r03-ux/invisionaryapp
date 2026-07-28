// ============================================================================
// Carica il corpus `knowledge/**/*.md` nella base di conoscenza dell'agente.
//
// Uso (PowerShell, dalla radice del progetto):
//   $env:INGEST_EMAIL="admin@example.com"; $env:INGEST_PASSWORD="..."
//   node scripts/ingest-knowledge.mjs
//
// Opzioni:
//   --dry            mostra cosa verrebbe caricato, senza chiamare l'API
//   --only=<testo>   carica solo i file il cui percorso contiene <testo>
//
// L'ingest è idempotente: ogni file sostituisce i propri chunk precedenti
// (stessa `source`), quindi lo script si può rilanciare a ogni modifica.
//
// Richiede EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY nel .env
// e credenziali di un utente con ruolo `admin`.
// ============================================================================
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const KNOWLEDGE_DIR = join(ROOT, 'knowledge');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice('--only='.length) ?? null;

const DOMAINS = new Set([
  'metodo',
  'vendita',
  'marketing',
  'network',
  'investimenti',
  'trading',
  'mindset',
  'piattaforma',
  'compliance',
]);

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});

async function main() {
  await loadDotEnv();

  const files = (await walk(KNOWLEDGE_DIR)).filter(
    (f) => f.endsWith('.md') && !f.toLowerCase().endsWith(`${sep}readme.md`),
  );
  const selected = ONLY ? files.filter((f) => f.includes(ONLY)) : files;

  if (selected.length === 0) throw new Error('Nessun file .md trovato in knowledge/.');

  const docs = [];
  for (const file of selected) {
    const raw = await readFile(file, 'utf8');
    const { meta, body } = parseFrontMatter(raw);
    const rel = relative(ROOT, file).split(sep).join('/');

    if (!meta.title) throw new Error(`${rel}: manca "title" nel front-matter.`);
    if (!meta.domain) throw new Error(`${rel}: manca "domain" nel front-matter.`);
    if (!DOMAINS.has(meta.domain)) {
      throw new Error(`${rel}: dominio "${meta.domain}" non valido. Ammessi: ${[...DOMAINS].join(', ')}`);
    }
    if (body.trim().length < 200) throw new Error(`${rel}: contenuto troppo breve.`);

    docs.push({
      path: rel,
      source: meta.title,
      domain: meta.domain,
      tags: meta.tags ?? [],
      text: body.trim(),
    });
  }

  console.log(`Trovati ${docs.length} documenti:\n`);
  for (const d of docs) {
    console.log(`  [${d.domain.padEnd(12)}] ${d.source}  (${d.text.length} caratteri)  ← ${d.path}`);
  }

  if (DRY_RUN) {
    console.log('\n--dry: nessuna scrittura effettuata.');
    return;
  }

  const client = await signIn();

  console.log('\nIngestione in corso…\n');
  let totalChunks = 0;
  for (const doc of docs) {
    const { data, error } = await client.functions.invoke('ai-ingest', {
      body: {
        text: doc.text,
        source: doc.source,
        domain: doc.domain,
        metadata: { tags: doc.tags, path: doc.path },
        markdown: true,
        replace: true,
      },
    });
    if (error) throw new Error(`${doc.source}: ${error.message}`);
    if (data?.error) throw new Error(`${doc.source}: ${data.error}`);

    totalChunks += data.inserted;
    console.log(
      `  ✓ ${doc.source} — ${data.inserted} chunk` +
        (data.deleted ? ` (sostituiti ${data.deleted})` : ''),
    );
  }

  console.log(`\n✔ Fatto: ${docs.length} documenti, ${totalChunks} chunk in base di conoscenza.`);
}

// ----------------------------------------------------------------------------

async function signIn() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.INGEST_EMAIL;
  const password = process.env.INGEST_PASSWORD;

  if (!url || !anonKey) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY mancanti (.env).');
  }
  if (!email || !password) {
    throw new Error('Imposta INGEST_EMAIL e INGEST_PASSWORD (utente con ruolo admin).');
  }

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login fallito: ${error.message}`);
  return client;
}

/** Carica .env senza dipendenze esterne (KEY=VALUE, righe # ignorate). */
async function loadDotEnv() {
  let raw;
  try {
    raw = await readFile(join(ROOT, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out.sort();
}

/** Front-matter YAML minimale: `chiave: valore` e `tags: [a, b]`. */
function parseFrontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^\s*([A-Za-z_]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      meta[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return { meta, body: raw.slice(match[0].length) };
}
