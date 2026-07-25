// ============================================================================
// Edge Function (Deno) — Agente AI RAG di Invisionary.
// Flusso: embedding domanda (Voyage) -> retrieval (match_documents) -> Claude.
//
// Secret richiesti (supabase secrets set ...): ANTHROPIC_API_KEY, VOYAGE_API_KEY.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono iniettati automaticamente.
// La chiave Anthropic resta lato server: MAI esposta al client.
// ============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

import { embedTexts } from '../_shared/voyage.ts';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const SYSTEM = `Sei l'assistente AI di Invisionary, piattaforma per networker, assicuratori e trader con formazione ed educazione finanziaria.
Rispondi in italiano, in modo chiaro e diretto, senza esporre il tuo ragionamento.
USA ESCLUSIVAMENTE le informazioni presenti nel CONTESTO fornito. Se la risposta non è nel contesto, dillo apertamente ("Non ho informazioni sufficienti su questo") e non inventare.
NON fornire consulenza finanziaria personalizzata né promesse di rendimento: i contenuti sono a scopo educativo e informativo.
Quando utile, cita la fonte tra parentesi.`;

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

    // 1. Embedding della domanda.
    const [queryEmbedding] = await embedTexts([message], 'query');

    // 2. Retrieval dei chunk più pertinenti.
    const { data: matches, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: 6,
      similarity_threshold: 0.2,
    });
    if (error) throw error;

    const context =
      (matches ?? [])
        .map(
          (m: { source: string | null; content: string }, i: number) =>
            `[${i + 1}] (${m.source ?? 'documento'})\n${m.content}`,
        )
        .join('\n\n') || '(nessun documento pertinente trovato)';

    // 3. Generazione con Claude (Opus 4.8).
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: SYSTEM,
      messages: [
        ...history,
        { role: 'user', content: `CONTESTO:\n${context}\n\nDOMANDA: ${message}` },
      ],
    });

    const answer = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('');

    return json({
      answer,
      sources: (matches ?? []).map((m: { source: string | null; similarity: number }) => ({
        source: m.source,
        similarity: m.similarity,
      })),
    });
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
