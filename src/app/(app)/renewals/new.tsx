import { useLocalSearchParams, useRouter } from 'expo-router';

import { RenewalForm } from '@/components/RenewalForm';
import { Screen, ThemedText } from '@/components/ui';
import { messaggioErrore } from '@/lib/errori';
import { useCreateRenewal } from '@/lib/renewals';
import { t } from '@/i18n/it';

export default function NewRenewal() {
  const create = useCreateRenewal();
  const router = useRouter();
  // Se si arriva da un cliente, si può pre-selezionare via query param.
  const { clientId, clientName } = useLocalSearchParams<{ clientId?: string; clientName?: string }>();

  return (
    <Screen scroll>
      <RenewalForm
        initial={{ client_id: clientId ?? null, clientName: clientName ?? null }}
        submitLabel="Crea rinnovo"
        loading={create.isPending}
        onSubmit={(input) => create.mutate(input, { onSuccess: () => router.back() })}
      />
      {create.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(create.error, t.rinnovi.form.creazioneFallita)}
        </ThemedText>
      )}
    </Screen>
  );
}
