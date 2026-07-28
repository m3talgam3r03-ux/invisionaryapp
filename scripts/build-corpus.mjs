// ============================================================================
// Genera `src/lib/corpus.generated.ts` dai file in `knowledge/`.
//
// Perché: il corpus è la competenza dell'agente e finora si caricava solo con
// uno script Node dal computer di chi sviluppa. Portandolo dentro il bundle,
// un amministratore può popolare o aggiornare la base di conoscenza da dentro
// l'app, senza toccare un terminale.
//
// Uso:
//   node scripts/build-corpus.mjs           # rigenera
//   node scripts/build-corpus.mjs --check   # esce con 1 se è disallineato
//
// Il file generato è versionato: `--check` gira nella valutazione e impedisce
// che il corpus nell'app resti indietro rispetto ai Markdown.
// ============================================================================
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const KNOWLEDGE_DIR = join(ROOT, 'knowledge');
const OUT_FILE = join(ROOT, 'src/lib/corpus.generated.ts');
const CHECK = process.argv.includes('--check');

const DOMAINS = new Set([
  'metodo', 'vendita', 'marketing', 'network', 'investimenti',
  'trading', 'mindset', 'piattaforma', 'compliance',
]);

main().catch((e) => {
  console.error(`✖ ${e.message}`);
  process.exit(1);
});

async function main() {
  const docs = await collect();
  const generated = render(docs);

  if (CHECK) {
    let current = '';
    try {
      current = await readFile(OUT_FILE, 'utf8');
    } catch {
      /* non ancora generato */
    }
    if (normalize(current) !== normalize(generated)) {
      console.error(
        '✖ src/lib/corpus.generated.ts è disallineato dai file in knowledge/.\n' +
          '  Rigenera con: node scripts/build-corpus.mjs',
      );
      process.exit(1);
    }
    console.log(`✓ corpus allineato (${docs.length} documenti)`);
    return;
  }

  await writeFile(OUT_FILE, generated, 'utf8');
  const chars = docs.reduce((n, d) => n + d.text.length, 0);
  console.log(`✔ ${docs.length} documenti (${Math.round(chars / 1000)}k caratteri) → src/lib/corpus.generated.ts`);
}

async function collect() {
  const files = (await walk(KNOWLEDGE_DIR)).filter(
    (f) => f.endsWith('.md') && !f.toLowerCase().endsWith(`${sep}readme.md`),
  );
  const docs = [];
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const { meta, body } = parseFrontMatter(raw);
    const rel = relative(ROOT, file).split(sep).join('/');

    if (!meta.title) throw new Error(`${rel}: manca "title" nel front-matter.`);
    if (!meta.domain) throw new Error(`${rel}: manca "domain" nel front-matter.`);
    if (!DOMAINS.has(meta.domain)) throw new Error(`${rel}: dominio "${meta.domain}" non valido.`);

    docs.push({
      source: meta.title,
      domain: meta.domain,
      tags: meta.tags ?? [],
      path: rel,
      text: body.trim(),
    });
  }
  return docs;
}

function render(docs) {
  const entries = docs
    .map(
      (d) => `  {
    source: ${JSON.stringify(d.source)},
    domain: ${JSON.stringify(d.domain)},
    tags: ${JSON.stringify(d.tags)},
    path: ${JSON.stringify(d.path)},
    text: ${JSON.stringify(d.text)},
  },`,
    )
    .join('\n');

  return `// ============================================================================
// FILE GENERATO — non modificare a mano.
// Sorgente: knowledge/**/*.md · Rigenera con: node scripts/build-corpus.mjs
//
// Contiene la base di conoscenza dell'agente, così un amministratore può
// caricarla o aggiornarla da dentro l'app senza usare un terminale.
// ============================================================================
import type { DomainId } from './domains';

export type CorpusDocument = {
  source: string;
  domain: DomainId;
  tags: string[];
  path: string;
  text: string;
};

export const CORPUS: CorpusDocument[] = [
${entries}
];

export const CORPUS_CHARS = ${docs.reduce((n, d) => n + d.text.length, 0)};
`;
}

/** Confronto insensibile ai fine riga: su Windows git normalizza in CRLF. */
function normalize(s) {
  return s.replace(/\r\n/g, '\n').trim();
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

function parseFrontMatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^\s*([A-Za-z_]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const value = kv[2].trim();
    meta[kv[1]] =
      value.startsWith('[') && value.endsWith(']')
        ? value.slice(1, -1).split(',').map((v) => v.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
        : value.replace(/^["']|["']$/g, '');
  }
  return { meta, body: raw.slice(match[0].length) };
}
