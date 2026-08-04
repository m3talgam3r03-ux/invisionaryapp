import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, TextField, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';
import { CONTACT_STATI, type ClientInput, type ContactStato } from '@/types/models';

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
  const [stato, setStato] = useState<ContactStato>(initial?.stato ?? 'nuovo');
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
      stato,
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

      {/* Fase della trattativa: ogni cambio finisce nello storico del contatto */}
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.crm.campoStato}
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CONTACT_STATI.map((s) => (
            <ChipStato key={s} stato={s} selezionato={stato === s} onPress={() => setStato(s)} />
          ))}
        </ScrollView>
      </View>
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

function ChipStato({
  stato,
  selezionato,
  onPress,
}: {
  stato: ContactStato;
  selezionato: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: selezionato }}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selezionato ? colors.accent : colors.border,
        backgroundColor: selezionato ? colors.accent : colors.surface,
      }}
    >
      <ThemedText variant="caption" style={{ color: selezionato ? '#FFFFFF' : colors.text }}>
        {t.crm.stato[stato]}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
