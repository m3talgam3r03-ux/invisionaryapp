// ============================================================================
// Edge Function (Deno) — Ingestione nella base di conoscenza dell'agente.
// Solo admin. Suddivide il testo in chunk, calcola gli embedding (Voyage) e
// li salva nella tabella `documents`.
//
// Body accettato:
//   { text, source?, title?, domain?, metadata?, replace?, markdown? }
//   · domain    → dominio di competenza (vendita | marketing | network |
//                 investimenti | trading | mindset | piattaforma | ...),
//                 usato dal retrieval per il boost.
//   · replace   → cancella i chunk esistenti della stessa `source` prima di
//                 reinserirli: rende il re-ingest idempotente.
//   · markdown  → usa il chunking per sezioni invece di quello a lunghezza fissa.
//
// Secret richiesti: VOYAGE_API_KEY. (SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY sono iniettati automaticamente.)
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { chunkMarkdown, chunkText, embedTexts } from '../_shared/voyage.ts';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    // Verifica che il chiamante sia admin.
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Non autenticato.' }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') return json({ error: 'Riservato agli amministratori.' }, 403);

    const body = await req.json();
    const text: unknown = body?.text;
    if (typeof text !== 'string' || text.trim() === '') {
      return json({ error: 'Campo "text" richiesto.' }, 400);
    }

    const source: string | null = body?.source ?? body?.title ?? null;
    const domain: string | null = typeof body?.domain === 'string' ? body.domain : null;
    const extra = isPlainObject(body?.metadata) ? body.metadata : {};
    const metadata = { ...extra, ...(domain ? { domain } : {}) };

    // Re-ingest idempotente: via i chunk precedenti della stessa fonte.
    let deleted = 0;
    if (body?.replace === true && source) {
      const { count, error: delError } = await admin
        .from('documents')
        .delete({ count: 'exact' })
        .eq('source', source);
      if (delError) throw delError;
      deleted = count ?? 0;
    }

    const chunks =
      body?.markdown === true && source ? chunkMarkdown(text, source) : chunkText(text);
    if (chunks.length === 0) return json({ inserted: 0, deleted });

    const embeddings = await embedTexts(chunks, 'document');
    const rows = chunks.map((content, i) => ({
      source,
      content,
      metadata,
      embedding: embeddings[i],
    }));

    const { error } = await admin.from('documents').insert(rows);
    if (error) throw error;

    return json({ inserted: rows.length, deleted, domain });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore interno.' }, 500);
  }
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
