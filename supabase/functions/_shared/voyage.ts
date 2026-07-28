// Embedding via Voyage AI (raccomandato da Anthropic; Anthropic non fornisce embedding).
// Il modello e la dimensione devono combaciare con vector(1024) nella migrazione 0005.
const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3.5';
const DIM = 1024;
const BATCH = 100;

export async function embedTexts(
  texts: string[],
  inputType: 'query' | 'document',
): Promise<number[][]> {
  const apiKey = Deno.env.get('VOYAGE_API_KEY');
  if (!apiKey) throw new Error('VOYAGE_API_KEY mancante');

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: batch,
        model: MODEL,
        input_type: inputType,
        output_dimension: DIM,
      }),
    });
    if (!res.ok) {
      throw new Error(`Voyage ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    for (const item of data.data) {
      out.push(item.embedding as number[]);
    }
  }
  return out;
}

/**
 * Suddivide un documento Markdown rispettando la struttura: prima taglia sulle
 * intestazioni (##/###), poi eventualmente per dimensione. Ogni chunk viene
 * prefissato con titolo e percorso della sezione, così l'embedding conserva il
 * contesto e l'estratto resta leggibile nel prompt.
 *
 * Migliora nettamente il retrieval rispetto al taglio "cieco" a 1000 caratteri:
 * un chunk non finisce più a metà di un elenco privo di titolo.
 */
export function chunkMarkdown(markdown: string, title: string, maxChars = 1200): string[] {
  const lines = markdown.split(/\r?\n/);

  type Section = { heading: string; body: string[] };
  const sections: Section[] = [{ heading: '', body: [] }];

  for (const line of lines) {
    const match = /^(#{2,4})\s+(.*)$/.exec(line);
    if (match) sections.push({ heading: match[2].trim(), body: [] });
    else sections[sections.length - 1].body.push(line);
  }

  const chunks: string[] = [];
  for (const section of sections) {
    const body = section.body.join('\n').trim();
    if (!body) continue;

    const label = section.heading ? `${title} — ${section.heading}` : title;
    // Sezione lunga: la si spezza ancora, ma ogni pezzo conserva l'intestazione.
    const pieces = body.length <= maxChars ? [body] : chunkText(body, maxChars, 150);
    for (const piece of pieces) chunks.push(`${label}\n\n${piece}`);
  }

  return chunks.length > 0 ? chunks : chunkText(markdown, maxChars, 150);
}

/** Suddivide il testo in chunk (~maxChars) con sovrapposizione, su confini di parola. */
export function chunkText(text: string, maxChars = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end);
      if (lastSpace > start + maxChars * 0.5) end = lastSpace;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks.filter((c) => c.length > 0);
}
