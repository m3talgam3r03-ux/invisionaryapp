import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme';

export default function FormazioneLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Formazione' }} />
      {/* Titolo vuoto sui dettagli: lo dice già il contenuto, e libera la barra. */}
      <Stack.Screen name="[courseId]" options={{ title: '' }} />
      <Stack.Screen name="lezione/[lessonId]" options={{ title: '' }} />
      <Stack.Screen name="calendario" options={{ title: 'Calendario' }} />
      <Stack.Screen name="rete" options={{ title: 'Avanzamento rete' }} />
    </Stack>
  );
}
