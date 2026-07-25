import { useQuery } from '@tanstack/react-query';

import type { Course, Lesson } from '@/types/models';

import { supabase } from './supabase';

/** Elenco corsi (ordinati). */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async (): Promise<Course[]> => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('ordine', { ascending: true });
      if (error) throw error;
      return data as Course[];
    },
  });
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['courses', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Course> => {
      const { data, error } = await supabase.from('courses').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as Course;
    },
  });
}

/** Lezioni di un corso (ordinate). */
export function useLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ['lessons', courseId],
    enabled: Boolean(courseId),
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId as string)
        .order('ordine', { ascending: true });
      if (error) throw error;
      return data as Lesson[];
    },
  });
}

export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: ['lesson', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Lesson> => {
      const { data, error } = await supabase.from('lessons').select('*').eq('id', id as string).single();
      if (error) throw error;
      return data as Lesson;
    },
  });
}
