import { Stack } from 'expo-router';

import { modalScreenOptions, stackScreenOptions } from '@/theme';

export default function CommunityLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Community' }} />
      <Stack.Screen name="nuovo" options={{ ...modalScreenOptions, title: 'Nuovo post' }} />
    </Stack>
  );
}
