import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ConteggioRegione, RiepilogoMappa } from './mappa';

import { supabase } from './supabase';

/**
 * Gli iscritti per regione.
 *
 * Il conteggio lo fa Postgres con `mappa_iscritti()`, che è SECURITY DEFINER
 * perché un collaboratore vede solo il proprio profilo. Escono SOLO conteggi —
 * e le regioni sotto la soglia arrivano già con `iscritti: null`, soppresse
 * dal database: se le sopprimesse l'app, il numero vero sarebbe comunque
 * arrivato sul telefono.
 */
export function useMappaIscritti() {
  return useQuery({
    queryKey: ['mappa-iscritti'],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<ConteggioRegione[]> => {
      const { data, error } = await supabase.rpc('mappa_iscritti', {});
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        regione: r.regione as string,
        iscritti: r.iscritti === null ? null : Number(r.iscritti),
      }));
    },
  });
}

/** Il riepilogo sotto la mappa. Non contiene il totale generale, di proposito. */
export function useRiepilogoMappa() {
  return useQuery({
    queryKey: ['mappa-riepilogo'],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<RiepilogoMappa> => {
      const { data, error } = await supabase.rpc('riepilogo_mappa', {});
      if (error) throw error;
      const r = ((data ?? []) as Record<string, unknown>[])[0];
      return {
        totaleVisibile: Number(r?.totale_visibile ?? 0),
        regioniVisibili: Number(r?.regioni_visibili ?? 0),
        regioniNascoste: Number(r?.regioni_nascoste ?? 0),
        senzaRegione: Number(r?.senza_regione ?? 0),
      };
    },
  });
}

/**
 * La propria regione. Facoltativa: chi non vuole dirla resta fuori dalla mappa,
 * e non è un problema da risolvere.
 */
export function useImpostaRegione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (regione: string | null) => {
      const { data: sessione } = await supabase.auth.getUser();
      const io = sessione.user?.id;
      if (!io) throw new Error('Sessione scaduta.');

      const { error } = await supabase.from('profiles').update({ regione }).eq('id', io);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mappa-iscritti'] });
      void qc.invalidateQueries({ queryKey: ['mappa-riepilogo'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
