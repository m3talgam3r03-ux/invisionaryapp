import { useRouter } from 'expo-router';

import { ClientForm } from '@/components/ClientForm';
import { Screen, ThemedText } from '@/components/ui';
import { useCreateClient } from '@/lib/clients';

export default function NewClient() {
  const create = useCreateClient();
  const router = useRouter();

  return (
    <Screen scroll>
      <ClientForm
        submitLabel="Crea cliente"
        loading={create.isPending}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: () => router.back(),
          })
        }
      />
      {create.isError && (
        <ThemedText tone="error" variant="caption">
          {create.error instanceof Error ? create.error.message : 'Creazione non riuscita.'}
        </ThemedText>
      )}
    </Screen>
  );
}
