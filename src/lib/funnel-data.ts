import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Canale } from './funnel';

import { supabase } from './supabase';

export type Funnel = {
  id: string;
  slug: string;
  titolo: string;
  sottotitolo: string | null;
  attivo: boolean;
  canali: Canale[];
  testoConsenso: string;
  maxLeadOra: number;
  createdAt: string;
};

export type Lead = {
  id: string;
  nome: string | null;
  email: string | null;
  telefono: string | null;
  canaliAccettati: Canale[];
  createdAt: string;
};

/** I propri funnel. La RLS fa il resto: l'admin li vede tutti. */
export function useFunnels() {
  return useQuery({
    queryKey: ['funnels'],
    queryFn: async (): Promise<Funnel[]> => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, slug, titolo, sottotitolo, attivo, canali, testo_consenso, max_lead_ora, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        slug: r.slug as string,
        titolo: r.titolo as string,
        sottotitolo: (r.sottotitolo as string) ?? null,
        attivo: Boolean(r.attivo),
        canali: (r.canali as Canale[]) ?? [],
        testoConsenso: r.testo_consenso as string,
        maxLeadOra: Number(r.max_lead_ora),
        createdAt: r.created_at as string,
      }));
    },
  });
}

/**
 * I contatti arrivati da un funnel.
 *
 * Restano anche quando il contatto nel CRM viene cancellato: sono la prova di
 * cosa è stato raccolto e con quale consenso.
 */
export function useLead(funnelId: string | null | undefined) {
  return useQuery({
    queryKey: ['funnel-lead', funnelId],
    enabled: Boolean(funnelId),
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from('funnel_leads')
        .select('id, nome, email, telefono, canali_accettati, created_at')
        .eq('funnel_id', funnelId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        nome: (r.nome as string) ?? null,
        email: (r.email as string) ?? null,
        telefono: (r.telefono as string) ?? null,
        canaliAccettati: (r.canali_accettati as Canale[]) ?? [],
        createdAt: r.created_at as string,
      }));
    },
  });
}

export function useCreaFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      slug: string;
      titolo: string;
      sottotitolo?: string;
      canali: Canale[];
      testoConsenso: string;
    }) => {
      const { data: sessione } = await supabase.auth.getUser();
      const io = sessione.user?.id;
      if (!io) throw new Error('Sessione scaduta.');

      const { error } = await supabase.from('funnels').insert({
        owner_id: io,
        slug: input.slug,
        titolo: input.titolo,
        sottotitolo: input.sottotitolo ?? null,
        canali: input.canali,
        testo_consenso: input.testoConsenso,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['funnels'] });
    },
  });
}

/**
 * Accende e spegne un funnel.
 *
 * Spegnere non cancella: la pagina smette di accettare contatti, ma quelli già
 * arrivati e la prova dei loro consensi restano dove sono.
 */
export function useAttivaFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; attivo: boolean }) => {
      const { error } = await supabase
        .from('funnels')
        .update({ attivo: input.attivo })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['funnels'] });
    },
  });
}
