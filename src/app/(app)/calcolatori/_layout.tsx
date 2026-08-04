import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme';

export default function CalcolatoriLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Calcolatori' }} />
      <Stack.Screen name="lottaggio" options={{ title: 'Lottaggio' }} />
      <Stack.Screen name="interesse-composto" options={{ title: 'Interesse composto' }} />
    </Stack>
  );
}
