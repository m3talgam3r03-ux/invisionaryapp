import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ClientPicker } from '@/components/ClientPicker';
import { Button, TextField, ThemedText } from '@/components/ui';
import { isValidISODate } from '@/lib/date';
import { radius, spacing, useTheme } from '@/theme';
import { RENEWAL_STATUS, type RenewalInput, type RenewalStatus } from '@/types/models';

const STATUS_LABEL: Record<RenewalStatus, string> = {
  attivo: 'Attivo',
  in_attesa_approvazione: 'In attesa di approvazione',
  scaduto: 'Scaduto',
  annullato: 'Annullato',
};

type RenewalFormProps = {
  initial?: Partial<RenewalInput> & { clientName?: string | null };
  submitLabel: string;
  loading?: boolean;
  onSubmit: (input: RenewalInput) => void;
};

export function RenewalForm({ initial, submitLabel, loading, onSubmit }: RenewalFormProps) {
  const { colors } = useTheme();
  const [clientId, setClientId] = useState<string | null>(initial?.client_id ?? null);
  const [clientName, setClientName] = useState<string | null>(initial?.clientName ?? null);
  const [prodotto, setProdotto] = useState(initial?.prodotto ?? '');
  const [scadenza, setScadenza] = useState(initial?.current_due_date ?? '');
  const [alertDays, setAlertDays] = useState(String(initial?.interval_days ?? 30));
  const [status, setStatus] = useState<RenewalStatus>(initial?.status ?? 'attivo');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!isValidISODate(scadenza)) {
      setError('Inserisci una data di scadenza valida (AAAA-MM-GG).');
      return;
    }
    const durata = parseInt(alertDays, 10);
    setError(null);
    onSubmit({
      client_id: clientId,
      prodotto: prodotto.trim() || null,
      current_due_date: scadenza,
      interval_days: Number.isFinite(durata) && durata > 0 ? durata : 30,
      status,
    });
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <ClientPicker
        value={clientId}
        valueName={clientName}
        onChange={(id, nome) => {
          setClientId(id);
          setClientName(nome);
        }}
      />
      <TextField label="Prodotto" value={prodotto} onChangeText={setProdotto} placeholder="es. abbonamento o pacchetto" />
      <TextField
        label="Scadenza (AAAA-MM-GG)"
        value={scadenza}
        onChangeText={setScadenza}
        placeholder="2026-12-31"
        autoCapitalize="none"
        errorText={error ?? undefined}
      />
      <TextField
        label="Durata del rinnovo (giorni)"
        value={alertDays}
        onChangeText={setAlertDays}
        keyboardType="number-pad"
        placeholder="30"
      />
      <ThemedText tone="muted" variant="caption" style={{ marginTop: -spacing.md }}>
        Di quanto avanza la scadenza a ogni rinnovo approvato.
      </ThemedText>

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          Stato
        </ThemedText>
        <View style={styles.statusRow}>
          {RENEWAL_STATUS.map((s) => {
            const selected = status === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accent : colors.surface,
                }}
              >
                <ThemedText variant="caption" style={{ color: selected ? '#FFFFFF' : colors.text }}>
                  {STATUS_LABEL[s]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button title={submitLabel} onPress={submit} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
