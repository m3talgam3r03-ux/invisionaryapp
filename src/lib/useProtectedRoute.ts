import type { Session } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

/**
 * Guardia di navigazione:
 * - senza sessione e fuori dal gruppo (auth) → redirect a /sign-in;
 * - con sessione ma dentro (auth) → redirect alla home protetta.
 */
export function useProtectedRoute(session: Session | null, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, isLoading, segments, router]);
}
