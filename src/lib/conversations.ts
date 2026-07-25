import { supabase } from './supabase';

export type StoredMessage = { id: string; role: 'user' | 'assistant'; content: string };

/** Id dell'ultima conversazione dell'utente (o null). */
export async function getLatestConversationId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoredMessage[];
}

export async function createConversation(): Promise<string> {
  const { data, error } = await supabase.from('ai_conversations').insert({}).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('ai_messages')
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw error;
  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}
