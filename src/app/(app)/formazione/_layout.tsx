import { Stack } from 'expo-router';

import { darkColors } from '@/theme';

export default function FormazioneLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Formazione' }} />
      <Stack.Screen name="[courseId]" options={{ title: 'Corso' }} />
      <Stack.Screen name="lezione/[lessonId]" options={{ title: 'Lezione' }} />
      <Stack.Screen name="calendario" options={{ title: 'Calendario' }} />
      <Stack.Screen name="rete" options={{ title: 'Avanzamento rete' }} />
    </Stack>
  );
}
