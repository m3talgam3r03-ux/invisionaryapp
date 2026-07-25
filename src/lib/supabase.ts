// Polyfill URL richiesto da supabase-js in ambiente React Native.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Client Supabase (Postgres + Auth + Storage + Realtime).
 * Le credenziali arrivano da variabili d'ambiente Expo pubbliche (`EXPO_PUBLIC_*`),
 * MAI hardcoded. Copia `.env.example` in `.env` e inserisci i valori del progetto (regione EU).
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True quando l'ambiente contiene credenziali valide (non i placeholder). */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('YOUR-PROJECT') &&
  SUPABASE_ANON_KEY.length > 0 &&
  !SUPABASE_ANON_KEY.includes('YOUR-ANON');

/**
 * Usiamo fallback validi quando non configurato così l'import non lancia eccezioni
 * (createClient richiede un URL valido). La UI mostra comunque lo stato "non configurato".
 */
/**
 * Storage per la sessione auth:
 * - su native usiamo AsyncStorage;
 * - su web lasciamo lo storage predefinito di supabase-js (localStorage nel browser,
 *   memoria durante il rendering statico lato server) per NON accedere a `window` in SSR.
 */
const authStorage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : 'http://localhost:54321',
  isSupabaseConfigured ? SUPABASE_ANON_KEY : 'anon-key-placeholder',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Su mobile non gestiamo la sessione tramite URL del browser.
      detectSessionInUrl: false,
    },
  },
);

/**
 * Ping leggero all'endpoint di health di GoTrue per verificare la raggiungibilità.
 * Non richiede autenticazione. Lancia in caso di errore (gestito da TanStack Query).
 */
export async function checkSupabaseConnection(): Promise<'ok'> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  if (!res.ok) {
    throw new Error(`Supabase ha risposto ${res.status}`);
  }
  return 'ok';
}
