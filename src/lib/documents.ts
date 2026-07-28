import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CORPUS } from './corpus.generated';
import type { DomainId } from './domains';
import { supabase } from './supabase';

/** Un documento della base di conoscenza, aggregato dai suoi frammenti. */
export type KnowledgeDoc = {
  source: string;
  domain: string | null;
  chunks: number;
  updatedAt: string;
};

type DocumentRow = {
  id: string;
  source: string | null;
  domain: string | null;
  created_at: string;
};

/**
 * Elenco della base di conoscenza raggruppato per documento.
 * La tabella contiene frammenti: mostrarli uno per uno è illeggibile e non
 * dice nulla su cosa c'è dentro il cervello.
 */
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<KnowledgeDoc[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, source, domain, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;

      const bySource = new Map<string, KnowledgeDoc>();
      for (const row of (data ?? []) as DocumentRow[]) {
        const key = row.source ?? 'Senza titolo';
        const existing = bySource.get(key);
        if (existing) {
          existing.chunks += 1;
          if (row.created_at > existing.updatedAt) existing.updatedAt = row.created_at;
        } else {
          bySource.set(key, {
            source: key,
            domain: row.domain,
            chunks: 1,
            updatedAt: row.created_at,
          });
        }
      }
      return [...bySource.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
  });
}

export type IngestInput = {
  source?: string;
  text: string;
  domain?: DomainId;
  /** Chunking per sezione invece che a lunghezza fissa. */
  markdown?: boolean;
  /** Sostituisce i frammenti già presenti con la stessa fonte. */
  replace?: boolean;
};

export type IngestResult = { inserted: number; deleted?: number };

async function ingestOne(input: IngestInput): Promise<IngestResult> {
  const { data, error } = await supabase.functions.invoke<IngestResult>('ai-ingest', {
    body: input,
  });
  if (error) throw error;
  if (!data) throw new Error('Nessuna risposta dalla function di ingestione.');
  return data;
}

/** Ingestione di un singolo documento (solo admin). */
export function useIngestDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ingestOne,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

/** Rimuove un documento e tutti i suoi frammenti. */
export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source: string) => {
      const { error } = await supabase.from('documents').delete().eq('source', source);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export type SeedProgress = { done: number; total: number; current: string };

/**
 * Carica (o aggiorna) l'intero corpus incluso nell'app.
 *
 * Sequenziale di proposito: ogni documento richiede embedding lato server, e
 * mandarne 19 in parallelo significa sbattere contro i limiti di frequenza di
 * Voyage. `replace: true` rende l'operazione ripetibile senza duplicare nulla.
 */
export function useSeedCorpus(onProgress?: (p: SeedProgress) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ documents: number; chunks: number }> => {
      let chunks = 0;
      for (let i = 0; i < CORPUS.length; i++) {
        const doc = CORPUS[i];
        onProgress?.({ done: i, total: CORPUS.length, current: doc.source });
        const result = await ingestOne({
          source: doc.source,
          text: doc.text,
          domain: doc.domain,
          markdown: true,
          replace: true,
        });
        chunks += result.inserted;
      }
      onProgress?.({ done: CORPUS.length, total: CORPUS.length, current: '' });
      return { documents: CORPUS.length, chunks };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export { CORPUS };
