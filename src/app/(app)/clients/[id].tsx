import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ClientForm } from '@/components/ClientForm';
import { Avatar, Button, Card, EmptyState, Screen, ThemedText } from '@/components/ui';
import { useClient, useDeleteClient, useUpdateClient } from '@/lib/clients';
import { parseContact } from '@/lib/contact';
import { radius, spacing, useTheme } from '@/theme';

/** Conferma cross-platform (Alert su native, confirm su web). */
function confirmDelete(nome: string, onConfirm: () => void) {
  const message = `«${nome}» verrà eliminato definitivamente.`;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Eliminare il cliente?', message, [
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
  const [editing, setEditing] = useState(false);

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
        <EmptyState tone="error" title="Cliente non trovato" hint="Potrebbe essere stato eliminato." />
      </Screen>
    );
  }

  const contact = parseContact(client.contatto);

  function open(url: string) {
    Linking.openURL(url).catch(() => {
      /* nessuna app in grado di gestire il link */
    });
  }

  // In modifica si mostra solo il form: due modalità sovrapposte confondono.
  if (editing) {
    return (
      <Screen scroll>
        <ClientForm
          initial={client}
          submitLabel="Salva modifiche"
          loading={update.isPending}
          onSubmit={(input) =>
            update.mutate({ id: client.id, ...input }, { onSuccess: () => setEditing(false) })
          }
        />
        {update.isError && (
          <ThemedText tone="error" variant="caption">
            {update.error instanceof Error ? update.error.message : 'Salvataggio non riuscito.'}
          </ThemedText>
        )}
        <Button title="Annulla" variant="secondary" onPress={() => setEditing(false)} />
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* Chi è, a colpo d'occhio. */}
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={client.nome} size={64} />
        <ThemedText variant="title" style={{ textAlign: 'center' }}>
          {client.nome}
        </ThemedText>
        {client.prodotto ? (
          <ThemedText tone="muted" variant="caption">
            {client.prodotto}
          </ThemedText>
        ) : null}
      </View>

      {/* Azioni rapide: è la ragione per cui si apre una scheda dal telefono. */}
      {(contact.tel || contact.mailto) && (
        <View style={styles.actions}>
          {contact.tel && <QuickAction label="Chiama" glyph="✆" onPress={() => open(contact.tel!)} />}
          {contact.whatsapp && (
            <QuickAction label="WhatsApp" glyph="✽" onPress={() => open(contact.whatsapp!)} />
          )}
          {contact.mailto && (
            <QuickAction label="Email" glyph="✉" onPress={() => open(contact.mailto!)} />
          )}
        </View>
      )}

      {client.contatto ? (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="muted">
            Contatto
          </ThemedText>
          <ThemedText>{client.contatto}</ThemedText>
        </Card>
      ) : null}

      {client.note ? (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="muted">
            Note
          </ThemedText>
          <ThemedText>{client.note}</ThemedText>
        </Card>
      ) : null}

      <Button title="Modifica" onPress={() => setEditing(true)} />

      {/* Eliminare non è un'azione costruttiva: niente colore d'accento. */}
      <Pressable
        onPress={() =>
          confirmDelete(client.nome, () =>
            remove.mutate(client.id, { onSuccess: () => router.back() }),
          )
        }
        accessibilityRole="button"
        disabled={remove.isPending}
        style={{ alignSelf: 'center', padding: spacing.sm }}
      >
        <ThemedText tone="error" variant="caption">
          {remove.isPending ? 'Eliminazione…' : 'Elimina cliente'}
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

function QuickAction({
  label,
  glyph,
  onPress,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <ThemedText style={{ fontSize: 20, color: colors.text }}>{glyph}</ThemedText>
      <ThemedText variant="caption" tone="muted">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  action: {
    flex: 1,
    maxWidth: 120,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
});
