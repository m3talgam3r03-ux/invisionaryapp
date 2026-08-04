import { Stack } from 'expo-router';

import { modalScreenOptions, stackScreenOptions } from '@/theme';

export default function TradingLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Trading' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="classifica" options={{ title: 'Classifica' }} />
      <Stack.Screen name="connetti" options={{ ...modalScreenOptions, title: 'Collega MT5' }} />
    </Stack>
  );
}
