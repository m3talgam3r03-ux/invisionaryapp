import { Stack } from 'expo-router';

import { t } from '@/i18n/it';
import { stackScreenOptions } from '@/theme';

export default function FunnelLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: t.funnel.titolo }} />
    </Stack>
  );
}
