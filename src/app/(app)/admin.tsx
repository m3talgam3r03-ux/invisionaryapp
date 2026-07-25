import { Redirect, useRouter } from 'expo-router';

import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { spacing } from '@/theme';

export default function AdminScreen() {
  const { profile, isProfileLoading } = useAuth();
  const router = useRouter();

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }

  // Route riservata: chi non è admin torna alla home.
  if (profile?.role !== 'admin') {
    return <Redirect href="/" />;
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText variant="title">Pannello admin</ThemedText>
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">Gestione utenti e ruoli</ThemedText>
        <ThemedText tone="muted" variant="caption">
          Assegnazione ruoli, gerarchia leader→collaboratore e autorizzazioni: in arrivo nella
          Milestone 7.
        </ThemedText>
      </Card>
      <Button title="Torna alla home" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
