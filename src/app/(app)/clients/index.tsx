import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatoBadge } from '@/components/StatoBadge';
import { Avatar, EmptyState, SearchField, ThemedText, Colonna } from '@/components/ui';
import { t } from '@/i18n/it';
import { useClients, useClientsPerStato } from '@/lib/clients';
import { byName, matchesQuery, parseContact } from '@/lib/contact';
import { radius, spacing, useTheme } from '@/theme';
import { CONTACT_STATI, type Client, type ContactStato } from '@/types/models';

export default function ClientsList() {
  const [stato, setStato] = useState<ContactStato | null>(null);
  const { data, isLoading, isError, error, refetch, isRefetching } = useClients(
    stato ? { stati: [stato] } : {},
  );
  const { data: conteggi } = useClientsPerStato();
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
      <Colonna>
        <View style={styles.header}>
          <SearchField value={query} onChangeText={setQuery} placeholder={t.crm.cerca} />
  
          {/* Le fasi della trattativa: toccarne una restringe l'elenco */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <FiltroChip
              label={t.crm.tutti}
              attivo={stato === null}
              onPress={() => setStato(null)}
            />
            {CONTACT_STATI.map((s) => (
              <FiltroChip
                key={s}
                label={t.crm.stato[s]}
                conteggio={conteggi?.[s]}
                attivo={stato === s}
                onPress={() => setStato(stato === s ? null : s)}
              />
            ))}
          </ScrollView>
  
          <View style={styles.metaRow}>
            <ThemedText tone="muted" variant="caption">
              {query
                ? `${clients.length} di ${total}`
                : total === 1
                  ? '1 contatto'
                  : `${total} contatti`}
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Pressable
                onPress={() => router.push('/clients/rubrica')}
                accessibilityRole="button"
                hitSlop={8}
              >
                <ThemedText tone="accent" variant="caption">
                  ☎ {t.crm.rubrica.apri}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => router.push('/clients/import')}
                accessibilityRole="button"
                hitSlop={8}
              >
                <ThemedText tone="muted" variant="caption">
                  File ›
                </ThemedText>
              </Pressable>
            </View>
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
      </Colonna>
    </SafeAreaView>
  );
}

function FiltroChip({
  label,
  conteggio,
  attivo,
  onPress,
}: {
  label: string;
  conteggio?: number;
  attivo: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: attivo }}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: attivo ? colors.text : colors.border,
        backgroundColor: attivo ? colors.text : colors.surface,
      }}
    >
      <ThemedText variant="caption" style={{ color: attivo ? colors.background : colors.textMuted }}>
        {label}
        {conteggio != null && conteggio > 0 ? ` ${conteggio}` : ''}
      </ThemedText>
    </Pressable>
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
    <Pressable
        accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Avatar name={client.nome} />
        <View style={{ flex: 1, gap: 3 }}>
          <ThemedText variant="heading" numberOfLines={1}>
            {client.nome}
          </ThemedText>
          {subtitle ? (
            <ThemedText tone="muted" variant="caption" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
          <StatoBadge stato={client.stato} compatto />
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
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
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
