import { Stack } from 'expo-router';

import { modalScreenOptions, stackScreenOptions } from '@/theme';

export default function ClientsLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Contatti' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      {/* Creazione e importazione salgono dal basso: sono azioni, non luoghi. */}
      <Stack.Screen name="new" options={{ ...modalScreenOptions, title: 'Nuovo contatto' }} />
      <Stack.Screen name="import" options={{ ...modalScreenOptions, title: 'Importa' }} />
    </Stack>
  );
}
