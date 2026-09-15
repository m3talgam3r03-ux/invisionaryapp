import { Stack } from 'expo-router';

import { t } from '@/i18n/it';
import { stackScreenOptions } from '@/theme/navigation';

export default function RisultatiLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: t.risultati.titolo }} />
    </Stack>
  );
}
