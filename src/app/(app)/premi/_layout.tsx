import { Stack } from 'expo-router';

import { t } from '@/i18n/it';
import { stackScreenOptions } from '@/theme/navigation';

export default function PremiLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: t.premi.titolo }} />
    </Stack>
  );
}
