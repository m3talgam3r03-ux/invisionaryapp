import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, ThemedText, Colonna } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { daysUntil } from '@/lib/date';
import { messaggioErrore } from '@/lib/errori';
import { useSquadra } from '@/lib/network';
import { can } from '@/lib/permissions';
import { useRenewals } from '@/lib/renewals';
import { spacing, useTheme } from '@/theme';
import { RenewalRow } from '@/components/RenewalRow';
import type { RenewalWithClient } from '@/types/models';

/** Sotto questa soglia la scadenza si evidenzia in oro. Le push sono a -7/-3/-1. */
const GIORNI_PREAVVISO = 7;

export default function RenewalsList() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useRenewals();
  const { profile } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  const vedeLaRete = can(profile, 'renewals.network');
  const { data: squadra } = useSquadra();

  /**
   * Di chi è ogni rinnovo, per le sole righe altrui.
   *
   * Il proprio nome non ci va: su uno scadenzario personale comparirebbe su
   * ogni riga, e non distinguerebbe niente da niente.
   */
  const nomiAltrui = useMemo(() => {
    if (!vedeLaRete) return new Map<string, string>();
    return new Map(
      (squadra ?? []).filter((p) => p.id !== profile?.id).map((p) => [p.id, p.nome] as const),
    );
  }, [squadra, vedeLaRete, profile?.id]);

  // Tre gruppi: prima ciò che aspetta una decisione, poi ciò che scade presto.
  const gruppi = useMemo(() => {
    const tutti = data ?? [];
    const daApprovare: RenewalWithClient[] = [];
    const inScadenza: RenewalWithClient[] = [];
    const resto: RenewalWithClient[] = [];

    for (const r of tutti) {
      if (r.status === 'in_attesa_approvazione') daApprovare.push(r);
      else if (r.status === 'attivo' && daysUntil(r.current_due_date) <= GIORNI_PREAVVISO)
        inScadenza.push(r);
      else resto.push(r);
    }
    return { daApprovare, inScadenza, resto };
  }, [data]);

  const vuoto = !isLoading && !isError && (data ?? []).length === 0;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Colonna>
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textMuted} />
          }
        >
          <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
            <ThemedText variant="title">
              {vedeLaRete ? t.rinnovi.titoloRete : t.rinnovi.titoloMiei}
            </ThemedText>
            <ThemedText tone="muted" variant="caption">
              {vedeLaRete ? t.rinnovi.sottotitoloRete : t.rinnovi.sottotitoloMiei}
            </ThemedText>
          </View>
  
          <Button
            title={t.rinnovi.nuovo}
            onPress={() => router.push('/renewals/new')}
            style={{ marginBottom: spacing.lg }}
          />
  
          {isLoading && <ThemedText tone="muted">{t.rinnovi.caricamento}</ThemedText>}
  
          {isError && (
            <EmptyState
              tone="error"
              title={t.rinnovi.erroreElenco}
              hint={messaggioErrore(error, t.comune.errore)}
            />
          )}
  
          {vuoto && <EmptyState title={t.rinnovi.nessuno} hint={t.rinnovi.nessunoSuggerimento} />}
  
          <Sezione
            titolo={t.rinnovi.daApprovare}
            righe={gruppi.daApprovare}
            evidenza
            nomi={nomiAltrui}
          />
          <Sezione titolo={t.rinnovi.inScadenza} righe={gruppi.inScadenza} nomi={nomiAltrui} />
          <Sezione titolo={t.rinnovi.resto} righe={gruppi.resto} nomi={nomiAltrui} />
        </ScrollView>
      </Colonna>
    </SafeAreaView>
  );
}

function Sezione({
  titolo,
  righe,
  evidenza,
  nomi,
}: {
  titolo: string;
  righe: RenewalWithClient[];
  evidenza?: boolean;
  /** Nomi dei proprietari diversi da me. Vuota per chi vede solo i propri. */
  nomi: Map<string, string>;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  if (righe.length === 0) return null;

  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
      <View style={styles.sezioneHeader}>
        <ThemedText variant="label" tone={evidenza ? 'accent' : 'muted'}>
          {titolo}
        </ThemedText>
        <View style={[styles.linea, { backgroundColor: colors.border }]} />
        <ThemedText variant="label" tone="muted">
          {righe.length}
        </ThemedText>
      </View>

      {righe.map((r) => (
        <RenewalRow
          key={r.id}
          renewal={r}
          giorniPreavviso={GIORNI_PREAVVISO}
          proprietario={nomi.get(r.owner_id) ?? null}
          onPress={() => router.push({ pathname: '/renewals/[id]', params: { id: r.id } })}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  sezioneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linea: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
