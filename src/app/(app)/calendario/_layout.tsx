import { Stack } from 'expo-router';

import { t } from '@/i18n/it';
import { stackScreenOptions } from '@/theme/navigation';

export default function CalendarioLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: t.calendario.titolo }} />
      <Stack.Screen name="disponibilita" options={{ title: t.calendario.disponibilita }} />
    </Stack>
  );
}
