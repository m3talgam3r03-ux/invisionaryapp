import { useState } from 'react';
import { View } from 'react-native';

import { Button, TextField } from '@/components/ui';
import { spacing } from '@/theme';
import type { ClientInput } from '@/types/models';

type ClientFormProps = {
  initial?: Partial<ClientInput>;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (input: ClientInput) => void;
};

/** Form condiviso per creazione e modifica cliente. */
export function ClientForm({ initial, submitLabel, loading, onSubmit }: ClientFormProps) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [contatto, setContatto] = useState(initial?.contatto ?? '');
  const [prodotto, setProdotto] = useState(initial?.prodotto ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!nome.trim()) {
      setError('Il nome è obbligatorio.');
      return;
    }
    setError(null);
    onSubmit({
      nome: nome.trim(),
      contatto: contatto.trim() || null,
      prodotto: prodotto.trim() || null,
      note: note.trim() || null,
    });
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label="Nome *"
        value={nome}
        onChangeText={setNome}
        placeholder="Mario Rossi"
        errorText={error ?? undefined}
      />
      <TextField
        label="Contatto"
        value={contatto ?? ''}
        onChangeText={setContatto}
        placeholder="email o telefono"
        autoCapitalize="none"
      />
      <TextField
        label="Prodotto"
        value={prodotto ?? ''}
        onChangeText={setProdotto}
        placeholder="es. prodotto o servizio"
      />
      <TextField
        label="Note"
        value={note ?? ''}
        onChangeText={setNote}
        placeholder="Note libere"
        multiline
        numberOfLines={4}
        style={{ height: 100, textAlignVertical: 'top', paddingTop: spacing.md }}
      />
      <Button title={submitLabel} onPress={submit} loading={loading} />
    </View>
  );
}
