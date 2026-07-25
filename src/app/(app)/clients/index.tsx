import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ThemedText } from '@/components/ui';
import { useClients } from '@/lib/clients';
import { spacing, useTheme } from '@/theme';
import type { Client } from '@/types/models';

export default function ClientsList() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useClients();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.actions}>
        <Button
          title="+ Nuovo"
          onPress={() => router.push('/clients/new')}
          style={{ flex: 1 }}
        />
        <Button
          title="Importa"
          variant="secondary"
          onPress={() => router.push('/clients/import')}
          style={{ flex: 1 }}
        />
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textMuted} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ThemedText tone="muted">Caricamento clienti…</ThemedText>
          ) : isError ? (
            <View style={{ gap: spacing.sm }}>
              <ThemedText tone="error">Impossibile caricare i clienti.</ThemedText>
              <ThemedText tone="muted" variant="caption">
                {error instanceof Error ? error.message : 'Errore sconosciuto'}
              </ThemedText>
              <ThemedText tone="muted" variant="caption">
                Verifica che il file .env sia configurato e che la migrazione 0002 sia applicata.
              </ThemedText>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <ThemedText variant="heading">Nessun cliente</ThemedText>
              <ThemedText tone="muted" variant="caption">
                Aggiungi il primo cliente o importa un file CSV/Excel.
              </ThemedText>
            </View>
          )
        }
        renderItem={({ item }) => <ClientRow client={item} onPress={() => router.push({ pathname: '/clients/[id]', params: { id: item.id } })} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

function ClientRow({ client, onPress }: { client: Client; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={{ gap: spacing.xs }}>
        <ThemedText variant="heading">{client.nome}</ThemedText>
        {client.prodotto ? (
          <ThemedText tone="muted" variant="caption">
            {client.prodotto}
          </ThemedText>
        ) : null}
        {client.contatto ? (
          <ThemedText tone="muted" variant="caption">
            {client.contatto}
          </ThemedText>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
});
