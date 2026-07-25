import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Document } from '@/types/models';

import { supabase } from './supabase';

/** Elenco documenti nella base di conoscenza (i più recenti). */
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<Document[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, source, content, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Document[];
    },
  });
}

/** Ingestione di un documento tramite la Edge Function `ai-ingest` (solo admin). */
export function useIngestDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { source?: string; text: string }): Promise<{ inserted: number }> => {
      const { data, error } = await supabase.functions.invoke<{ inserted: number }>('ai-ingest', {
        body: input,
      });
      if (error) throw error;
      return data ?? { inserted: 0 };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
