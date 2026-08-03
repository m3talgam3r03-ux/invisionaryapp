import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/models';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  /** Caricamento della sessione iniziale (getSession). */
  isLoading: boolean;
  /** Caricamento del profilo (ruolo) dopo il login. */
  isProfileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sessione iniziale (locale, non richiede rete).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    // Aggiornamenti successivi (login/logout/refresh token).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId as string)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });

  const profile = profileQuery.data ?? null;

  // Il ruolo viaggia anche dentro il token (migrazione 0011) e le policy RLS lo
  // leggono da lì. Ma il token si rinnova ogni ora: se un admin cambia il ruolo
  // a qualcuno, per quella persona il claim resta indietro fino al rinnovo.
  // Qui confrontiamo il claim con la riga di `profiles`, che è la verità: se
  // divergono, chiediamo subito un token nuovo. Così la finestra si chiude alla
  // prima apertura dell'app invece di durare un'ora.
  useEffect(() => {
    if (!session || !profile) return;
    const claim = (session.user.app_metadata as { role?: string } | undefined)?.role;
    // claim assente = hook non ancora attivo: non è una divergenza, si ripiega
    // sulla tabella (vedi is_admin() nella 0011).
    if (!claim || claim === profile.role) return;
    void supabase.auth.refreshSession();
  }, [session, profile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      isProfileLoading: profileQuery.isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        // Se la conferma email è attiva non c'è sessione finché l'utente non conferma.
        return { needsConfirmation: !data.session };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isLoading, profile, profileQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>.');
  return ctx;
}
