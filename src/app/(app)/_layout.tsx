import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/auth';
import { registerPushToken } from '@/lib/push';

export default function AppLayout() {
  const { session } = useAuth();
  const userId = session?.user.id;

  // Registra il token push quando l'utente è autenticato (no-op su web/emulatore).
  useEffect(() => {
    if (userId) {
      void registerPushToken(userId);
    }
  }, [userId]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
