import { Stack } from 'expo-router';

import { darkColors } from '@/theme';

export default function RenewalsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Scadenzario' }} />
      <Stack.Screen name="new" options={{ title: 'Nuovo rinnovo' }} />
      <Stack.Screen name="[id]" options={{ title: 'Rinnovo' }} />
    </Stack>
  );
}
