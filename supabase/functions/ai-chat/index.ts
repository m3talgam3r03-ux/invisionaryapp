// ============================================================================
// Edge Function (Deno) — Agente AI di Invisionary.
//
// Pipeline:
//   1. identità del chiamante (JWT) e contesto utente  -> _shared/context.ts
//   2. router di dominio (lessicale, costo zero)       -> _shared/brain.ts
//   3. query di retrieval contestualizzata sui follow-up
//   4. embedding (Voyage) + ricerca ampia con boost di dominio
//   5. rerank dei candidati (Voyage) -> pochi estratti davvero pertinenti
//   6. generazione con Claude (nucleo + playbook attivi + contesto utente)
//
// Secret richiesti (supabase secrets set ...): ANTHROPIC_API_KEY, VOYAGE_API_KEY.
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY sono iniettati.
// La chiave Anthropic resta lato server: MAI esposta al client.
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

import { buildRetrievalQuery, buildSystem, detectDomains, domainLabels } from '../_shared/brain.ts';
import { loadUserContext, renderUserContext } from '../_shared/context.ts';
import { embedTexts, rerank } from '../_shared/voyage.ts';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type Match = {
  id: string;
  source: string | null;
  domain: string | null;
  content: string;
  similarity: number;
  score: number;
};

const MODEL = 'claude-opus-5';
/** Si recupera largo e si restringe col reranker: è lì che si guadagna precisione. */
const RETRIEVE_CANDIDATES = 24;
const CONTEXT_CHUNKS = 6;

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const message: unknown = body?.message;
    if (typeof message !== 'string' || message.trim() === '') {
      return json({ error: 'Campo "message" richiesto.' }, 400);
    }

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
          .filter(
            (m: ChatMessage) =>
              (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string',
          )
          .slice(-6)
      : [];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1. Chi sta scrivendo. Il deploy ha verify_jwt attivo, ma qui serve l'id
    //    per caricare il contesto: senza utente si prosegue in modo anonimo.
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();

    let userContext: string | null = null;
    if (user) {
      try {
        const ctx = await loadUserContext(admin, user.id);
        if (ctx) userContext = renderUserContext(ctx);
      } catch (e) {
        // Il contesto è un miglioramento, non un requisito: se fallisce si
        // risponde comunque, solo in modo meno calibrato.
        console.error('Contesto utente non caricato:', e instanceof Error ? e.message : e);
      }
    }

    // 2. Quali competenze servono per questa domanda.
    const userTurns = history.filter((m) => m.role === 'user').map((m) => m.content);
    const domains = detectDomains(message, userTurns);

    // 3-4. Query contestualizzata, embedding, ricerca ampia con boost di dominio.
    const retrievalQuery = buildRetrievalQuery(message, userTurns);
    const [queryEmbedding] = await embedTexts([retrievalQuery], 'query');

    const { data, error } = await admin.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_count: RETRIEVE_CANDIDATES,
      similarity_threshold: 0.15,
      boost_domains: domains.length > 0 ? domains : null,
    });
    if (error) throw error;

    const candidates = (data ?? []) as Match[];

    // 5. Rerank: il vettoriale trova ciò che somiglia, il reranker ciò che
    //    risponde. Se non è disponibile si tengono i primi per similarità.
    let matches = candidates.slice(0, CONTEXT_CHUNKS);
    if (candidates.length > CONTEXT_CHUNKS) {
      const order = await rerank(
        retrievalQuery,
        candidates.map((c) => c.content),
        CONTEXT_CHUNKS,
      );
      if (order) matches = order.map((i) => candidates[i]);
    }

    const context =
      matches
        .map((m, i) => `[${i + 1}] (fonte: ${m.source ?? 'documento'})\n${m.content}`)
        .join('\n\n') ||
      '(nessun documento pertinente in base di conoscenza: rispondi con la tua competenza di dominio, dichiarando che non proviene dai materiali della piattaforma)';

    // 6. Generazione. Il nucleo del prompt è stabile a ogni chiamata: buono per
    //    la cache; variano playbook, contesto utente ed estratti recuperati.
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    // `output_config` è più recente dei tipi pubblicati dall'SDK: il payload è
    // valido a runtime, quindi si costruisce a parte per non dipendere dai tipi.
    const params: Record<string, unknown> = {
      model: MODEL,
      // Il tetto copre ragionamento + risposta: tenerlo largo evita troncamenti
      // (i token non usati non si pagano).
      max_tokens: 8192,
      system: buildSystem(domains, userContext),
      // Ragionamento adattivo a sforzo medio: qualità sulle domande di metodo
      // senza allungare troppo i tempi di una chat mobile.
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      messages: [
        ...history,
        { role: 'user', content: `CONTESTO:\n${context}\n\nDOMANDA: ${message}` },
      ],
    };

    const response = (await anthropic.messages.create(
      params as Parameters<typeof anthropic.messages.create>[0],
    )) as { content: Array<{ type: string; text?: string }> };

    const answer = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');

    return json({
      answer,
      domains: domainLabels(domains),
      sources: dedupeSources(matches),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore interno.' }, 500);
  }
});

/** Una riga per documento: più chunk della stessa fonte non vanno mostrati due volte. */
function dedupeSources(matches: Match[]): Array<{ source: string | null; similarity: number }> {
  const best = new Map<string, number>();
  for (const m of matches) {
    const key = m.source ?? 'documento';
    if (!best.has(key) || m.similarity > best.get(key)!) best.set(key, m.similarity);
  }
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([source, similarity]) => ({ source, similarity }));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
