// ============================================================================
// Edge Function (Deno) — Agente AI di Invisionary.
//
// Pipeline:
//   1. router di dominio (lessicale, costo zero)  -> _shared/brain.ts
//   2. embedding della domanda (Voyage)
//   3. retrieval con boost sui domini rilevati    -> rpc match_knowledge
//   4. generazione con Claude (system prompt = nucleo + playbook attivi)
//
// Secret richiesti (supabase secrets set ...): ANTHROPIC_API_KEY, VOYAGE_API_KEY.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono iniettati automaticamente.
// La chiave Anthropic resta lato server: MAI esposta al client.
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

import { buildSystem, detectDomains, domainLabels } from '../_shared/brain.ts';
import { embedTexts } from '../_shared/voyage.ts';

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Router: quali competenze servono per questa domanda.
    const domains = detectDomains(
      message,
      history.filter((m) => m.role === 'user').map((m) => m.content),
    );

    // 2. Embedding della domanda.
    const [queryEmbedding] = await embedTexts([message], 'query');

    // 3. Retrieval: i chunk del dominio pertinente ricevono un piccolo bonus,
    //    senza escludere il resto della base di conoscenza.
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_count: 8,
      similarity_threshold: 0.18,
      boost_domains: domains.length > 0 ? domains : null,
    });
    if (error) throw error;

    const matches = (data ?? []) as Match[];
    const context =
      matches
        .map((m, i) => `[${i + 1}] (fonte: ${m.source ?? 'documento'})\n${m.content}`)
        .join('\n\n') ||
      '(nessun documento pertinente in base di conoscenza: rispondi con la tua competenza di dominio, dichiarando che non proviene dai materiali della piattaforma)';

    // 4. Generazione. Il nucleo del prompt è stabile a ogni chiamata: buono per
    //    la cache; variano solo i playbook attivi e il contesto recuperato.
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    // `output_config` è più recente dei tipi pubblicati dall'SDK: il payload è
    // valido a runtime, quindi si costruisce a parte per non dipendere dai tipi.
    const params: Record<string, unknown> = {
      model: MODEL,
      // Il tetto copre ragionamento + risposta: tenerlo largo evita troncamenti
      // (i token non usati non si pagano).
      max_tokens: 8192,
      system: buildSystem(domains),
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
