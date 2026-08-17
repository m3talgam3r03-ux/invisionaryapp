import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ClientForm } from '@/components/ClientForm';
import { ConsentPanel } from '@/components/ConsentPanel';
import { StatoBadge } from '@/components/StatoBadge';
import { Avatar, Button, Card, EmptyState, Screen, ThemedText, Sezione } from '@/components/ui';
import { t } from '@/i18n/it';
import { useClient, useClientHistory, useDeleteClient, useUpdateClient } from '@/lib/clients';
import { parseContact } from '@/lib/contact';
import { formatDateIT } from '@/lib/date';
import { messaggioErrore } from '@/lib/errori';
import { radius, spacing, useTheme } from '@/theme';
import type { ContactStatusHistoryEntry } from '@/types/models';

/** Conferma cross-platform (Alert su native, confirm su web). */
function confirmDelete(nome: string, onConfirm: () => void) {
  const message = t.crm.scheda.confermaTesto(nome);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert(t.crm.scheda.confermaTitolo, message, [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Elimina', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: client, isLoading, isError } = useClient(id);
  const { data: storico } = useClientHistory(id);
  const update = useUpdateClient();
  const remove = useDeleteClient();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <ThemedText tone="muted">{t.crm.scheda.caricamento}</ThemedText>
      </Screen>
    );
  }

  if (isError || !client) {
    return (
      <Screen>
        <EmptyState tone="error" title={t.crm.scheda.nonTrovato} hint={t.crm.scheda.nonTrovatoSuggerimento} />
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
            {messaggioErrore(update.error, t.crm.form.salvataggioFallito)}
          </ThemedText>
        )}
        <Button title={t.crm.scheda.annulla} variant="secondary" onPress={() => setEditing(false)} />
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
        <StatoBadge stato={client.stato} />
        {client.ultimo_contatto_at && (
          <ThemedText tone="muted" variant="caption">
            {t.crm.ultimoContatto(formatDateIT(client.ultimo_contatto_at.slice(0, 10)))}
          </ThemedText>
        )}
      </View>

      {/* Azioni rapide: è la ragione per cui si apre una scheda dal telefono. */}
      {(contact.tel || contact.mailto) && (
        <View style={styles.actions}>
          {contact.tel && <QuickAction label={t.crm.scheda.chiama} glyph="✆" onPress={() => open(contact.tel!)} />}
          {contact.whatsapp && (
            <QuickAction label={t.crm.scheda.whatsapp} glyph="✽" onPress={() => open(contact.whatsapp!)} />
          )}
          {contact.mailto && (
            <QuickAction label={t.crm.scheda.email} glyph="✉" onPress={() => open(contact.mailto!)} />
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

      {/* Consensi per canale: senza, il contatto non entra negli invii */}
      <ConsentPanel client={client} />

      {/* Dove si è mosso il contatto: serve a capire dove si perde la rete */}
      <Storico righe={storico ?? []} />

      <Button title={t.crm.scheda.modifica} onPress={() => setEditing(true)} />

      {/* Eliminare non è un'azione costruttiva: niente colore d'accento. */}
      <Pressable
        onPress={() =>
          confirmDelete(client.nome, () =>
            remove.mutate(client.id, { onSuccess: () => router.back() }),
          )
        }
        accessibilityRole="button"
        accessibilityState={{ disabled: remove.isPending }}
        disabled={remove.isPending}
        style={{ alignSelf: 'center', padding: spacing.sm }}
      >
        <ThemedText tone="error" variant="caption">
          {remove.isPending ? t.crm.scheda.eliminazioneInCorso : t.crm.scheda.elimina}
        </ThemedText>
      </Pressable>

      {/* Se l'eliminazione non riesce non succedeva NIENTE: si confermava, la
          scritta tornava «Elimina cliente» e il contatto restava lì. Il caso
          più probabile è un rinnovo collegato, e allora il messaggio giusto
          («c'è dell'altro collegato») dice anche cosa fare. */}
      {remove.isError && (
        <ThemedText tone="error" variant="caption" style={{ textAlign: 'center' }}>
          {messaggioErrore(remove.error, t.crm.scheda.eliminazioneFallita)}
        </ThemedText>
      )}
    </Screen>
  );
}

function Storico({ righe }: { righe: ContactStatusHistoryEntry[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Sezione titolo={t.crm.storico.titolo} />

      {righe.length === 0 ? (
        <ThemedText tone="muted" variant="caption">
          {t.crm.storico.vuoto}
        </ThemedText>
      ) : (
        righe.map((r) => (
          <Card key={r.id} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ThemedText variant="caption" style={{ flex: 1 }}>
                {r.da_stato
                  ? t.crm.storico.passaggio(t.crm.stato[r.da_stato], t.crm.stato[r.a_stato])
                  : t.crm.storico.creato(t.crm.stato[r.a_stato])}
              </ThemedText>
              <ThemedText tone="muted" variant="caption">
                {formatDateIT(r.created_at.slice(0, 10))}
              </ThemedText>
            </View>
          </Card>
        ))
      )}
    </View>
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
