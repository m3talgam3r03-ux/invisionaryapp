import { Stack } from 'expo-router';

import { darkColors } from '@/theme';

export default function AgenteLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Agente AI' }} />
      <Stack.Screen name="documenti" options={{ title: 'Base di conoscenza' }} />
    </Stack>
  );
}
