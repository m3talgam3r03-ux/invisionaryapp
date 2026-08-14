import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, ThemedText } from '@/components/ui';
import { useClients } from '@/lib/clients';
import { radius, spacing, useTheme } from '@/theme';

type ClientPickerProps = {
  value: string | null;
  valueName?: string | null;
  onChange: (id: string | null, nome: string | null) => void;
  label?: string;
};

/** Selettore cliente: apre una modale con l'elenco dei clienti. */
export function ClientPicker({ value, valueName, onChange, label = 'Cliente' }: ClientPickerProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const { data: clients } = useClients();

  const selected = clients?.find((c) => c.id === value) ?? null;
  const displayName = selected?.nome ?? valueName ?? null;

  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="label" tone="muted">
        {label}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        // Il contenuto è un segnaposto finché non si sceglie: senza etichetta
        // uno screen reader leggerebbe «Seleziona cliente (opzionale)» e basta,
        // senza dire di quale campo si tratta.
        accessibilityLabel={`${label}: ${displayName ?? 'nessuno selezionato'}`}
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <ThemedText tone={displayName ? 'default' : 'muted'}>
          {displayName ?? 'Seleziona cliente (opzionale)'}
        </ThemedText>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        {/* Lo sfondo chiude toccandolo: va detto, altrimenti si annuncia
            «pulsante» senza dire cosa fa. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        >
          {/* Il foglio non è un comando: intercetta il tocco perché non arrivi
              allo sfondo e chiuda. `accessibilityViewIsModal` tiene il lettore
              di schermo dentro la modale invece di farlo vagare sotto. */}
          <Pressable
            accessibilityViewIsModal
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <ThemedText variant="heading">Seleziona cliente</ThemedText>

            <Pressable
              accessibilityRole="button"
              style={styles.row}
              onPress={() => {
                onChange(null, null);
                setOpen(false);
              }}
            >
              <ThemedText tone="muted">— Nessun cliente</ThemedText>
            </Pressable>

            <FlatList
              data={clients ?? []}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 360 }}
              ItemSeparatorComponent={() => (
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
              )}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  style={styles.row}
                  onPress={() => {
                    onChange(item.id, item.nome);
                    setOpen(false);
                  }}
                >
                  <ThemedText>{item.nome}</ThemedText>
                </Pressable>
              )}
              ListEmptyComponent={
                <ThemedText tone="muted" variant="caption">
                  Nessun cliente disponibile. Aggiungine dal CRM.
                </ThemedText>
              }
            />

            <Button title="Chiudi" variant="secondary" onPress={() => setOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.md,
  },
  row: {
    paddingVertical: spacing.md,
  },
});
