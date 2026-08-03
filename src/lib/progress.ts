import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/auth';

import { supabase } from './supabase';

/** Insieme degli id delle lezioni completate dall'utente corrente. */
export function useLessonProgress() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['lesson-progress', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId as string);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.lesson_id as string));
    },
  });
}

export type AvanzamentoCorso = {
  course_id: string;
  completate: number;
  totale: number;
  percentuale: number;
};

/**
 * Avanzamento per corso dell'utente corrente, calcolato dal database
 * (vista `v_avanzamento_corso`). Le percentuali non si ricalcolano qui.
 */
export function useAvanzamentoCorsi() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['avanzamento-corsi', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Map<string, AvanzamentoCorso>> => {
      const { data, error } = await supabase
        .from('v_avanzamento_corso')
        .select('course_id, completate, totale, percentuale')
        .eq('user_id', userId as string);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.course_id as string, r as AvanzamentoCorso]));
    },
  });
}

/** Avanzamento complessivo dell'utente corrente (vista `v_avanzamento_globale`). */
export function useAvanzamentoGlobale() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['avanzamento-globale', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<{ completate: number; totale: number; percentuale: number }> => {
      const { data, error } = await supabase
        .from('v_avanzamento_globale')
        .select('completate, totale, percentuale')
        .eq('user_id', userId as string)
        .single();
      if (error) throw error;
      return data as { completate: number; totale: number; percentuale: number };
    },
  });
}

/** Segna/rimuove il completamento di una lezione per l'utente corrente. */
export function useToggleLesson() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (!userId) throw new Error('Non autenticato.');
      if (completed) {
        // rimuove SOLO la propria riga (esplicito: gli admin altrimenti cancellerebbero tutto)
        const { error } = await supabase
          .from('lesson_progress')
          .delete()
          .eq('lesson_id', lessonId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lesson_progress').insert({ lesson_id: lessonId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-progress'] });
      qc.invalidateQueries({ queryKey: ['network-progress'] });
      qc.invalidateQueries({ queryKey: ['avanzamento-corsi'] });
      qc.invalidateQueries({ queryKey: ['avanzamento-globale'] });
    },
  });
}
