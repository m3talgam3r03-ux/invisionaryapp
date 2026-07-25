import { Stack } from 'expo-router';

import { darkColors } from '@/theme';

export default function CalcolatoriLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Calcolatori' }} />
      <Stack.Screen name="lottaggio" options={{ title: 'Lottaggio' }} />
      <Stack.Screen name="interesse-composto" options={{ title: 'Interesse composto' }} />
    </Stack>
  );
}
