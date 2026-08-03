import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, ThemedText } from '@/components/ui';
import { daysUntil, formatDateIT } from '@/lib/date';
import { useRenewals } from '@/lib/renewals';
import { spacing, useTheme } from '@/theme';
import type { RenewalStatus, RenewalWithClient } from '@/types/models';

const STATUS_LABEL: Record<RenewalStatus, string> = {
  attivo: 'Attivo',
  in_attesa_approvazione: 'In attesa di approvazione',
  scaduto: 'Scaduto',
  annullato: 'Annullato',
};

/** Giorni di preavviso per l'evidenza in oro. Gli avvisi push sono a -7/-3/-1. */
const GIORNI_PREAVVISO = 7;

export default function RenewalsList() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useRenewals();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.actions}>
        <Button title="+ Nuovo rinnovo" onPress={() => router.push('/renewals/new')} style={{ flex: 1 }} />
      </View>

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textMuted} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          isLoading ? (
            <ThemedText tone="muted">Caricamento scadenzario…</ThemedText>
          ) : isError ? (
            <EmptyState
              tone="error"
              title="Impossibile caricare i rinnovi"
              hint={error instanceof Error ? error.message : 'Errore sconosciuto.'}
            />
          ) : (
            <EmptyState
              title="Nessun rinnovo"
              hint="Aggiungi una scadenza per iniziare a monitorarla."
            />
          )
        }
        renderItem={({ item }) => (
          <RenewalRow
            renewal={item}
            onPress={() => router.push({ pathname: '/renewals/[id]', params: { id: item.id } })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function RenewalRow({ renewal, onPress }: { renewal: RenewalWithClient; onPress: () => void }) {
  const days = daysUntil(renewal.current_due_date);
  const isActive = renewal.status === 'attivo';

  // Urgenza (solo per i rinnovi attivi): scaduto → error, in avviso → gold, altrimenti muted.
  let urgencyTone: 'error' | 'gold' | 'muted' = 'muted';
  let urgencyText: string;
  if (days < 0) {
    urgencyTone = isActive ? 'error' : 'muted';
    urgencyText = `Scaduto da ${Math.abs(days)} g`;
  } else if (days === 0) {
    urgencyTone = isActive ? 'error' : 'muted';
    urgencyText = 'Scade oggi';
  } else {
    urgencyTone = isActive && days <= GIORNI_PREAVVISO ? 'gold' : 'muted';
    urgencyText = `Tra ${days} g`;
  }

  const title = renewal.client?.nome ?? renewal.prodotto ?? 'Rinnovo';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={{ gap: spacing.xs }}>
        <View style={styles.rowHeader}>
          <ThemedText variant="heading" style={{ flex: 1 }}>
            {title}
          </ThemedText>
          <ThemedText tone={urgencyTone} variant="label">
            {urgencyText}
          </ThemedText>
        </View>
        <ThemedText tone="muted" variant="caption">
          {formatDateIT(renewal.current_due_date)}
          {renewal.prodotto && renewal.client?.nome ? ` · ${renewal.prodotto}` : ''}
          {!isActive ? ` · ${STATUS_LABEL[renewal.status]}` : ''}
        </ThemedText>
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
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
