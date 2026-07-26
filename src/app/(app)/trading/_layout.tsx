import { Stack } from 'expo-router';

import { darkColors } from '@/theme';

export default function TradingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: darkColors.surface },
        headerTintColor: darkColors.text,
        headerTitleStyle: { color: darkColors.text },
        contentStyle: { backgroundColor: darkColors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Trading' }} />
      <Stack.Screen name="connetti" options={{ title: 'Collega account MT5' }} />
      <Stack.Screen name="[id]" options={{ title: 'Account' }} />
      <Stack.Screen name="classifica" options={{ title: 'Classifica trader' }} />
    </Stack>
  );
}
