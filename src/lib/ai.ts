import { supabase } from './supabase';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type AgentSource = { source: string | null; similarity: number };

export type AgentReply = {
  answer: string;
  sources: AgentSource[];
  /** Aree di competenza attivate dal router per questa domanda (es. "Vendita"). */
  domains?: string[];
  /** Quanti fatti l'agente ha annotato su di te con questa risposta. */
  ricordati?: number;
};

/** Il tetto è stato raggiunto: non è un guasto, e va detto diversamente. */
export class LimiteAgente extends Error {
  constructor(readonly tipo: 'limite_giornaliero' | 'limite_mensile') {
    super(tipo);
    this.name = 'LimiteAgente';
  }
}

/**
 * Interroga l'agente AI (Edge Function `ai-chat`): embedding + retrieval + Claude.
 * La chiave Anthropic resta lato server; qui passiamo solo la domanda e la cronologia.
 *
 * Il tetto di spesa lo applica il server prima di pagare qualsiasi cosa. Qui si
 * riconosce il 429 e lo si trasforma in un errore parlante: «hai finito le
 * domande di oggi» è un'informazione, «errore 429» è un guasto — e le due cose
 * meritano due schermate diverse.
 */
export async function askAgent(message: string, history: ChatMessage[] = []): Promise<AgentReply> {
  const { data, error } = await supabase.functions.invoke<AgentReply & { limite?: string }>(
    'ai-chat',
    { body: { message, history } },
  );

  if (error) {
    const limite = await leggiLimite(error);
    if (limite) throw new LimiteAgente(limite);
    throw error;
  }
  if (!data) throw new Error('Nessuna risposta dall’agente.');
  return data;
}

/**
 * Il corpo della risposta di errore.
 *
 * `functions.invoke` non espone lo stato: il corpo sta in `error.context`, che
 * è la `Response` grezza. Se non si riesce a leggerla si torna `null` e
 * l'errore risale com'è — meglio un messaggio generico che uno inventato.
 */
async function leggiLimite(
  error: unknown,
): Promise<'limite_giornaliero' | 'limite_mensile' | null> {
  const contesto = (error as { context?: unknown }).context;
  if (!contesto || typeof (contesto as Response).json !== 'function') return null;
  try {
    const corpo = (await (contesto as Response).json()) as { limite?: string };
    if (corpo?.limite === 'P0003') return 'limite_giornaliero';
    if (corpo?.limite === 'P0002') return 'limite_mensile';
    return null;
  } catch {
    return null;
  }
}
