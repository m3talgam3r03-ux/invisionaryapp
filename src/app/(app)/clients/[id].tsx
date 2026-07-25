import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, View } from 'react-native';

import { ClientForm } from '@/components/ClientForm';
import { Button, Screen, ThemedText } from '@/components/ui';
import { useClient, useDeleteClient, useUpdateClient } from '@/lib/clients';
import { spacing } from '@/theme';

/** Conferma cross-platform (Alert su native, confirm su web). */
function confirmDelete(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm('Eliminare definitivamente il cliente?')) {
      onConfirm();
    }
    return;
  }
  Alert.alert('Eliminare cliente', 'Operazione irreversibile.', [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Elimina', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: client, isLoading, isError } = useClient(id);
  const update = useUpdateClient();
  const remove = useDeleteClient();

  if (isLoading) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }

  if (isError || !client) {
    return (
      <Screen>
        <ThemedText tone="error">Cliente non trovato.</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ClientForm
        initial={client}
        submitLabel="Salva modifiche"
        loading={update.isPending}
        onSubmit={(input) =>
          update.mutate({ id: client.id, ...input }, { onSuccess: () => router.back() })
        }
      />

      {update.isError && (
        <ThemedText tone="error" variant="caption">
          {update.error instanceof Error ? update.error.message : 'Salvataggio non riuscito.'}
        </ThemedText>
      )}

      <View style={{ height: spacing.md }} />

      <Button
        title="Elimina cliente"
        variant="secondary"
        loading={remove.isPending}
        onPress={() =>
          confirmDelete(() => remove.mutate(client.id, { onSuccess: () => router.back() }))
        }
      />
    </Screen>
  );
}
