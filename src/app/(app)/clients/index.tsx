import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, EmptyState, SearchField, ThemedText } from '@/components/ui';
import { useClients } from '@/lib/clients';
import { byName, matchesQuery, parseContact } from '@/lib/contact';
import { radius, spacing, useTheme } from '@/theme';
import type { Client } from '@/types/models';

export default function ClientsList() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useClients();
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  // Alfabetico: in un CRM si cerca una persona a occhio, e l'ordine di
  // inserimento non aiuta nessuno a trovarla.
  const clients = useMemo(() => {
    const all = [...(data ?? [])].sort(byName);
    return query ? all.filter((c) => matchesQuery(c, query)) : all;
  }, [data, query]);

  const total = data?.length ?? 0;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Cerca nome, contatto, prodotto…" />
        <View style={styles.metaRow}>
          <ThemedText tone="muted" variant="caption">
            {query
              ? `${clients.length} di ${total}`
              : total === 1
                ? '1 cliente'
                : `${total} clienti`}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/clients/import')}
            accessibilityRole="button"
            hitSlop={8}
          >
            <ThemedText tone="muted" variant="caption">
              Importa da file ›
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textMuted} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ThemedText tone="muted">Caricamento clienti…</ThemedText>
          ) : isError ? (
            <EmptyState
              tone="error"
              title="Impossibile caricare i clienti"
              hint={error instanceof Error ? error.message : 'Errore sconosciuto.'}
            />
          ) : query ? (
            <EmptyState
              title="Nessun risultato"
              hint={`Nessun cliente corrisponde a «${query}».`}
              actionLabel="Cancella la ricerca"
              onAction={() => setQuery('')}
            />
          ) : (
            <EmptyState
              title="Nessun cliente"
              hint="Aggiungi il primo contatto, oppure importa un elenco da CSV o Excel."
              actionLabel="+ Aggiungi cliente"
              onAction={() => router.push('/clients/new')}
            />
          )
        }
        renderItem={({ item }) => (
          <ClientRow
            client={item}
            onPress={() => router.push({ pathname: '/clients/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      {/* Azione primaria unica e sempre raggiungibile col pollice. */}
      <Pressable
        onPress={() => router.push('/clients/new')}
        accessibilityRole="button"
        accessibilityLabel="Aggiungi cliente"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <ThemedText style={styles.fabGlyph}>+</ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

function ClientRow({ client, onPress }: { client: Client; onPress: () => void }) {
  const { colors } = useTheme();
  const contact = parseContact(client.contatto);

  // Sottotitolo: prodotto e contatto su una riga sola. Tre righe di grigio
  // uguale rendevano ogni scheda indistinguibile dalle altre.
  const subtitle = [client.prodotto, client.contatto].filter(Boolean).join(' · ');

  function open(url: string) {
    Linking.openURL(url).catch(() => {
      /* nessuna app in grado di gestire il link */
    });
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Avatar name={client.nome} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="heading" numberOfLines={1}>
            {client.nome}
          </ThemedText>
          {subtitle ? (
            <ThemedText tone="muted" variant="caption" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {contact.tel && (
          <Pressable
            onPress={() => open(contact.tel!)}
            accessibilityRole="button"
            accessibilityLabel={`Chiama ${client.nome}`}
            hitSlop={8}
            style={[styles.quick, { borderColor: colors.border }]}
          >
            <ThemedText style={{ color: colors.textMuted }}>✆</ThemedText>
          </Pressable>
        )}
        {contact.mailto && (
          <Pressable
            onPress={() => open(contact.mailto!)}
            accessibilityRole="button"
            accessibilityLabel={`Scrivi a ${client.nome}`}
            hitSlop={8}
            style={[styles.quick, { borderColor: colors.border }]}
          >
            <ThemedText style={{ color: colors.textMuted }}>✉</ThemedText>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  quick: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // `boxShadow` è l'API corrente: le prop `shadow*` sono deprecate e su web
    // stampano un avviso a ogni render.
    boxShadow: '0 4px 8px rgba(0,0,0,0.30)',
  },
  fabGlyph: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '300',
  },
});
