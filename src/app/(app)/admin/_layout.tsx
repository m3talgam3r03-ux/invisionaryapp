import { Stack } from 'expo-router';

import { darkColors } from '@/theme';

export default function AdminLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Gestione utenti' }} />
      <Stack.Screen name="[id]" options={{ title: 'Utente' }} />
    </Stack>
  );
}
