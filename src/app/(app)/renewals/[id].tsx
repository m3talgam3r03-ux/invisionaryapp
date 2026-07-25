import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, View } from 'react-native';

import { RenewalForm } from '@/components/RenewalForm';
import { Button, Screen, ThemedText } from '@/components/ui';
import { useDeleteRenewal, useRenewal, useUpdateRenewal } from '@/lib/renewals';
import { spacing } from '@/theme';

function confirmDelete(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm('Eliminare definitivamente il rinnovo?')) {
      onConfirm();
    }
    return;
  }
  Alert.alert('Eliminare rinnovo', 'Operazione irreversibile.', [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Elimina', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function RenewalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: renewal, isLoading, isError } = useRenewal(id);
  const update = useUpdateRenewal();
  const remove = useDeleteRenewal();

  if (isLoading) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }

  if (isError || !renewal) {
    return (
      <Screen>
        <ThemedText tone="error">Rinnovo non trovato.</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <RenewalForm
        initial={renewal}
        submitLabel="Salva modifiche"
        loading={update.isPending}
        onSubmit={(input) =>
          update.mutate({ id: renewal.id, ...input }, { onSuccess: () => router.back() })
        }
      />

      {update.isError && (
        <ThemedText tone="error" variant="caption">
          {update.error instanceof Error ? update.error.message : 'Salvataggio non riuscito.'}
        </ThemedText>
      )}

      <View style={{ height: spacing.md }} />

      <Button
        title="Elimina rinnovo"
        variant="secondary"
        loading={remove.isPending}
        onPress={() =>
          confirmDelete(() => remove.mutate(renewal.id, { onSuccess: () => router.back() }))
        }
      />
    </Screen>
  );
}
