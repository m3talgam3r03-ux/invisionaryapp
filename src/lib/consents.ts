import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Canale, ConsentHistoryEntry, ContactConsent } from '@/types/models';

import { supabase } from './supabase';

const KEY = 'consents';

/**
 * Consensi correnti di un contatto, uno per canale.
 *
 * L'assenza di una riga NON è un consenso: è «non lo sappiamo», che ai fini
 * dell'invio vale quanto un no. Per questo la mappa restituita contiene solo i
 * canali su cui esiste una decisione registrata.
 */
export function useConsents(clientId: string | undefined) {
  return useQuery({
    queryKey: [KEY, clientId],
    enabled: Boolean(clientId),
    queryFn: async (): Promise<Map<Canale, ContactConsent>> => {
      const { data, error } = await supabase
        .from('contact_consents')
        .select('*')
        .eq('client_id', clientId as string);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.canale as Canale, r as ContactConsent]));
    },
  });
}

/** Storico dei consensi: quando sono stati dati e quando tolti. */
export function useConsentHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: [KEY, clientId, 'history'],
    enabled: Boolean(clientId),
    queryFn: async (): Promise<ConsentHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('consent_history')
        .select('*')
        .eq('client_id', clientId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConsentHistoryEntry[];
    },
  });
}

/**
 * Registra o revoca un consenso.
 *
 * Il testo dell'informativa viene salvato insieme al consenso: senza sapere
 * COSA ha accettato la persona, il consenso non dimostra niente.
 */
export function useSetConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      clientId: string;
      canale: Canale;
      valore: boolean;
      testoInformativa: string;
    }): Promise<void> => {
      const { error } = await supabase.from('contact_consents').upsert(
        {
          client_id: input.clientId,
          canale: input.canale,
          valore: input.valore,
          origine: 'manuale',
          testo_informativa: input.testoInformativa,
        },
        { onConflict: 'client_id,canale' },
      );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [KEY, v.clientId] });
    },
  });
}

/** Esporta tutto ciò che è registrato su un contatto (diritto di accesso). */
export function useExportContact() {
  return useMutation({
    mutationFn: async (clientId: string): Promise<unknown> => {
      const { data, error } = await supabase.rpc('export_contact_data', {
        contact_id: clientId,
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Cancella un contatto e tutto ciò che vi è collegato (diritto alla
 * cancellazione). Il registro tiene traccia dell'avvenuta cancellazione, non
 * dei dati cancellati: conservarli sarebbe una cancellazione finta.
 */
export function useDeleteContactData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; motivo?: string }): Promise<boolean> => {
      const { data, error } = await supabase.rpc('delete_contact_data', {
        contact_id: input.clientId,
        motivo: input.motivo ?? null,
      });
      if (error) throw error;
      return Boolean(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}
