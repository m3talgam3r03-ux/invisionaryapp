import { useQuery } from '@tanstack/react-query';

import type { Strumento } from './position-size';

import { supabase } from './supabase';

export type StrumentoDB = Strumento & {
  id: string;
  tipo: 'forex' | 'indice' | 'metallo' | 'energia' | 'cripto';
};

/**
 * Gli strumenti disponibili, dal database.
 * Stanno in tabella e non nel codice: aggiungere una coppia o correggere la
 * dimensione di un contratto non richiede un rilascio.
 */
export function useInstruments() {
  return useQuery({
    queryKey: ['instruments'],
    // Cambiano di rado: tenerli in memoria evita una query a ogni apertura.
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<StrumentoDB[]> => {
      const { data, error } = await supabase
        .from('instruments')
        .select('id, symbol, tipo, contract_size, quote_currency, pip_size, unita')
        .eq('attivo', true)
        .order('ordine');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        symbol: r.symbol as string,
        tipo: r.tipo as StrumentoDB['tipo'],
        contractSize: Number(r.contract_size),
        quoteCurrency: r.quote_currency as string,
        pipSize: Number(r.pip_size),
        unita: (r.unita as string) ?? 'pip',
      }));
    },
  });
}

export type Cambio = {
  rate: number;
  fetchedAt: string | null;
  minutiFa: number | null;
  /** Vero se non abbiamo nessun valore: l'app deve chiedere di inserirlo a mano. */
  mancante: boolean;
};

/**
 * Cambio dalla valuta di quotazione a quella del conto.
 *
 * Non blocca mai: se il fornitore non ha aggiornato, si usa l'ultimo valore
 * noto e si mostra da quanto tempo è fermo. Se non c'è proprio nulla, si
 * segnala `mancante` così l'interfaccia può chiedere di inserirlo a mano
 * invece di calcolare con un numero inventato.
 */
export function useCambio(base: string | undefined, quote: string | undefined) {
  const uguali = Boolean(base && quote && base.toUpperCase() === quote.toUpperCase());

  return useQuery({
    queryKey: ['cambio', base, quote],
    enabled: Boolean(base && quote),
    staleTime: 1000 * 60 * 15,
    queryFn: async (): Promise<Cambio> => {
      // Stessa valuta: nessuna rete, il cambio è 1 per definizione.
      if (uguali) return { rate: 1, fetchedAt: null, minutiFa: 0, mancante: false };

      const { data, error } = await supabase.rpc('cambio', {
        base_ccy: base,
        quote_ccy: quote,
      });
      if (error) throw error;

      const riga = (data ?? [])[0] as
        | { rate: number | null; fetched_at: string | null; minuti_fa: number | null }
        | undefined;

      if (!riga || riga.rate == null) {
        return { rate: 1, fetchedAt: null, minutiFa: null, mancante: true };
      }
      return {
        rate: Number(riga.rate),
        fetchedAt: riga.fetched_at,
        minutiFa: riga.minuti_fa,
        mancante: false,
      };
    },
  });
}

/** Da quanto tempo è fermo un cambio, in parole. */
export function etaCambio(minutiFa: number | null): string | null {
  if (minutiFa === null) return null;
  if (minutiFa < 2) return 'aggiornato ora';
  if (minutiFa < 60) return `aggiornato ${minutiFa} minuti fa`;
  const ore = Math.round(minutiFa / 60);
  if (ore < 24) return `aggiornato ${ore} ${ore === 1 ? 'ora' : 'ore'} fa`;
  const giorni = Math.round(ore / 24);
  return `aggiornato ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'} fa`;
}
