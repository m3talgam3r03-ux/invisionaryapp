import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Registra il token push Expo dell'utente su Supabase (tabella push_tokens).
 * Difensivo: su web, su emulatore o senza permessi/progetto EAS non fa nulla.
 * `expo-notifications` è importato dinamicamente SOLO su native (niente carico su web/SSR).
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;

    const Notifications = await import('expo-notifications');

    // Mostra le notifiche anche con app in primo piano.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return; // il token push richiede un progetto EAS (npx eas init)

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.from('push_tokens').upsert({ user_id: userId, token }, { onConflict: 'token' });
  } catch {
    // Non bloccare mai l'app per la registrazione push.
  }
}
