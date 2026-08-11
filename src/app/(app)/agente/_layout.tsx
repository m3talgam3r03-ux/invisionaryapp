import { Stack } from 'expo-router';

import { t } from '@/i18n/it';
import { stackScreenOptions } from '@/theme';

export default function AgenteLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Agente AI' }} />
      <Stack.Screen name="documenti" options={{ title: 'Base di conoscenza' }} />
      <Stack.Screen name="memoria" options={{ title: t.agente.memoriaTitolo }} />
    </Stack>
  );
}
