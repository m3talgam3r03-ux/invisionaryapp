// ============================================================================
// Edge Function (Deno) — Ingestione documenti nella base di conoscenza RAG.
// Solo admin. Suddivide il testo in chunk, calcola gli embedding (Voyage) e
// li salva nella tabella `documents`.
//
// Secret richiesti: VOYAGE_API_KEY. (SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY sono iniettati automaticamente.)
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

import { chunkText, embedTexts } from '../_shared/voyage.ts';

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

    const chunks = chunkText(text);
    if (chunks.length === 0) return json({ inserted: 0 });

    const embeddings = await embedTexts(chunks, 'document');
    const rows = chunks.map((content, i) => ({ source, content, embedding: embeddings[i] }));

    const { error } = await admin.from('documents').insert(rows);
    if (error) throw error;

    return json({ inserted: rows.length });
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
