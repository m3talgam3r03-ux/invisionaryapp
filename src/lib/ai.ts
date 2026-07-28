import { supabase } from './supabase';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type AgentSource = { source: string | null; similarity: number };

export type AgentReply = {
  answer: string;
  sources: AgentSource[];
  /** Aree di competenza attivate dal router per questa domanda (es. "Vendita"). */
  domains?: string[];
};

/**
 * Interroga l'agente AI (Edge Function `ai-chat`): embedding + retrieval + Claude.
 * La chiave Anthropic resta lato server; qui passiamo solo la domanda e la cronologia.
 */
export async function askAgent(message: string, history: ChatMessage[] = []): Promise<AgentReply> {
  const { data, error } = await supabase.functions.invoke<AgentReply>('ai-chat', {
    body: { message, history },
  });
  if (error) throw error;
  if (!data) throw new Error('Nessuna risposta dall’agente.');
  return data;
}
