import { Stack } from 'expo-router';

import { modalScreenOptions, stackScreenOptions } from '@/theme';

export default function RenewalsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Rinnovi' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="new" options={{ ...modalScreenOptions, title: 'Nuovo rinnovo' }} />
    </Stack>
  );
}
