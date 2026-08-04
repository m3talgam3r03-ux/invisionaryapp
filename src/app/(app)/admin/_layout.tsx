import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme';

export default function AdminLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Utenti' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}
