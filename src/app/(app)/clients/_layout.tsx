import { Stack } from 'expo-router';

import { darkColors } from '@/theme';

export default function ClientsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Clienti' }} />
      <Stack.Screen name="new" options={{ title: 'Nuovo cliente' }} />
      <Stack.Screen name="[id]" options={{ title: 'Cliente' }} />
      <Stack.Screen name="import" options={{ title: 'Importa CSV / Excel' }} />
    </Stack>
  );
}
