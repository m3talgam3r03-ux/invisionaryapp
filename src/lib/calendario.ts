import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Slot } from './booking';

import { chiaveGiorno } from './booking';
import { supabase } from './supabase';

export type Prenotazione = {
  id: string;
  hostId: string;
  guestId: string;
  inizio: string;
  fine: string;
  stato: 'confermata' | 'annullata';
  titolo: string | null;
  note: string | null;
  /** Nome dell'altra persona, quando il join lo restituisce. */
  hostNome: string | null;
  guestNome: string | null;
};

export type RegolaDisponibilita = {
  id: string;
  giornoSettimana: number;
  oraInizio: string;
  oraFine: string;
  durataMinuti: number;
  attivo: boolean;
};

export type HostPrenotabile = {
  id: string;
  nome: string;
  ruolo: string;
  fuso: string | null;
};

/**
 * Con chi si può prenotare: il proprio leader e l'amministrazione.
 * L'elenco lo filtra la RLS su `profiles` — qui non si decide niente.
 */
export function useHostPrenotabili() {
  return useQuery({
    queryKey: ['host-prenotabili'],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<HostPrenotabile[]> => {
      const { data: sessione } = await supabase.auth.getUser();
      const io = sessione.user?.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, fuso, leader_id')
        .in('role', ['leader', 'admin'])
        .order('full_name');
      if (error) throw error;

      return (data ?? [])
        .filter((p) => p.id !== io)
        .map((p) => ({
          id: p.id as string,
          nome: (p.full_name as string) ?? '—',
          ruolo: p.role as string,
          fuso: (p.fuso as string) ?? null,
        }));
    },
  });
}

/**
 * Slot liberi di una persona, per i prossimi `giorni`.
 *
 * Il calcolo lo fa Postgres: ha il database dei fusi e vede le prenotazioni
 * altrui, che l'app non deve poter leggere. Qui arrivano solo gli orari liberi.
 */
export function useSlotLiberi(hostId: string | null | undefined, giorni = 21) {
  return useQuery({
    queryKey: ['slot-liberi', hostId, giorni],
    enabled: Boolean(hostId),
    // Corti: uno slot può sparire da un momento all'altro perché lo prende
    // qualcun altro. Meglio riscaricarli spesso che mostrarne di finti.
    staleTime: 1000 * 30,
    queryFn: async (): Promise<Slot[]> => {
      const oggi = new Date();
      const fine = new Date(oggi.getTime() + giorni * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase.rpc('slot_liberi', {
        p_host: hostId,
        p_da: chiaveGiorno(oggi),
        p_a: chiaveGiorno(fine),
      });
      if (error) throw error;

      return ((data ?? []) as { inizio: string; fine: string }[]).map((r) => ({
        inizio: r.inizio,
        fine: r.fine,
      }));
    },
  });
}

/**
 * Le proprie prenotazioni, come ospite e come host.
 *
 * I nomi si leggono con una seconda query invece che con un join annidato:
 * `bookings` ha DUE chiavi esterne verso `profiles` (host e guest), e in quel
 * caso PostgREST non sa quale seguire senza un suggerimento esplicito. Due
 * query su pochi record costano meno di un join ambiguo che si rompe in
 * produzione.
 */
export function usePrenotazioni() {
  return useQuery({
    queryKey: ['prenotazioni'],
    queryFn: async (): Promise<Prenotazione[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, host_id, guest_id, inizio, fine, stato, titolo, note')
        .order('inizio', { ascending: true });
      if (error) throw error;

      const righe = data ?? [];
      const ids = [
        ...new Set(righe.flatMap((r) => [r.host_id as string, r.guest_id as string])),
      ];
      const nomi = await leggiNomi(ids);

      return righe.map((r) => ({
        id: r.id as string,
        hostId: r.host_id as string,
        guestId: r.guest_id as string,
        inizio: r.inizio as string,
        fine: r.fine as string,
        stato: r.stato as Prenotazione['stato'],
        titolo: (r.titolo as string) ?? null,
        note: (r.note as string) ?? null,
        hostNome: nomi.get(r.host_id as string) ?? null,
        guestNome: nomi.get(r.guest_id as string) ?? null,
      }));
    },
  });
}

async function leggiNomi(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('id, full_name').in('id', ids);
  if (error) throw error;
  return new Map(
    (data ?? []).map((p) => [p.id as string, (p.full_name as string) ?? '—'] as const),
  );
}

/**
 * Prenota uno slot.
 *
 * Non c'è nessun controllo «è ancora libero?» prima dell'inserimento, ed è
 * voluto: fra il controllo e la scrittura passerebbe abbastanza tempo perché
 * qualcun altro lo prenda. A rifiutare la seconda scrittura è il vincolo di
 * esclusione nel database, che è atomico. La schermata deve solo saper
 * riconoscere l'errore — `classificaErrore()` lo fa.
 */
export function usePrenota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { hostId: string; slot: Slot; titolo?: string; note?: string }) => {
      const { data: sessione } = await supabase.auth.getUser();
      const io = sessione.user?.id;
      if (!io) throw new Error('Sessione scaduta.');

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          host_id: input.hostId,
          guest_id: io,
          inizio: input.slot.inizio,
          fine: input.slot.fine,
          titolo: input.titolo ?? null,
          note: input.note ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prenotazioni'] });
      void qc.invalidateQueries({ queryKey: ['slot-liberi'] });
    },
  });
}

/** Annulla: la riga resta, con traccia di chi e quando. */
export function useAnnullaPrenotazione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').update({ stato: 'annullata' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prenotazioni'] });
      void qc.invalidateQueries({ queryKey: ['slot-liberi'] });
    },
  });
}

// --- Disponibilità (lato di chi ospita) -------------------------------------

export function useDisponibilita(hostId: string | null | undefined) {
  return useQuery({
    queryKey: ['disponibilita', hostId],
    enabled: Boolean(hostId),
    queryFn: async (): Promise<RegolaDisponibilita[]> => {
      const { data, error } = await supabase
        .from('availability_rules')
        .select('id, giorno_settimana, ora_inizio, ora_fine, durata_minuti, attivo')
        .eq('host_id', hostId)
        .order('giorno_settimana')
        .order('ora_inizio');
      if (error) throw error;

      return (data ?? []).map((r) => ({
        id: r.id as string,
        giornoSettimana: Number(r.giorno_settimana),
        oraInizio: r.ora_inizio as string,
        oraFine: r.ora_fine as string,
        durataMinuti: Number(r.durata_minuti),
        attivo: Boolean(r.attivo),
      }));
    },
  });
}

export function useSalvaRegola() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      giornoSettimana: number;
      oraInizio: string;
      oraFine: string;
      durataMinuti: number;
    }) => {
      const { data: sessione } = await supabase.auth.getUser();
      const io = sessione.user?.id;
      if (!io) throw new Error('Sessione scaduta.');

      const { error } = await supabase.from('availability_rules').insert({
        host_id: io,
        giorno_settimana: input.giornoSettimana,
        ora_inizio: input.oraInizio,
        ora_fine: input.oraFine,
        durata_minuti: input.durataMinuti,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['disponibilita'] });
      void qc.invalidateQueries({ queryKey: ['slot-liberi'] });
    },
  });
}

/**
 * Toglie una regola.
 *
 * Le prenotazioni già prese NON vengono toccate: sono impegni con qualcuno, e
 * farle sparire perché si è cambiata l'agenda sarebbe il modo peggiore di
 * disdire. Restano, e si annullano una per una se serve.
 */
export function useEliminaRegola() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('availability_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['disponibilita'] });
      void qc.invalidateQueries({ queryKey: ['slot-liberi'] });
    },
  });
}
