import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { RenewalForm } from '@/components/RenewalForm';
import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { formatDateIT } from '@/lib/date';
import { useProfileById } from '@/lib/admin';
import { can } from '@/lib/permissions';
import { opzioniRinnovo } from '@/lib/renewal-rules';
import {
  useApproveRenewal,
  useDeleteRenewal,
  useRenewal,
  useRenewalHistory,
  useUpdateRenewal,
} from '@/lib/renewals';
import { radius, spacing, useTheme } from '@/theme';
import type { Renewal, RenewalHistoryEntry } from '@/types/models';

function confermaEliminazione(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(t.rinnovi.form.eliminaConferma)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(t.rinnovi.form.elimina, t.rinnovi.form.eliminaConferma, [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Elimina', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function RenewalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { data: renewal, isLoading, isError } = useRenewal(id);
  const { data: storico } = useRenewalHistory(id);
  // Serve il leader del proprietario per sapere se posso approvare io.
  const { data: proprietario } = useProfileById(renewal?.owner_id);
  const update = useUpdateRenewal();
  const remove = useDeleteRenewal();

  if (isLoading) {
    return (
      <Screen>
        <ThemedText tone="muted">{t.comune.caricamento}</ThemedText>
      </Screen>
    );
  }
  if (isError || !renewal) {
    return (
      <Screen>
        <ThemedText tone="error">{t.rinnovi.nonTrovato}</ThemedText>
      </Screen>
    );
  }

  const possoApprovare = can(profile, 'renewals.approve', {
    ownerId: renewal.owner_id,
    leaderId: proprietario?.leader_id ?? null,
  });
  const inAttesa = renewal.status === 'in_attesa_approvazione';

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {inAttesa && (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="accent">
            {t.rinnovi.stato.in_attesa_approvazione}
          </ThemedText>
          <ThemedText tone="muted" variant="caption">
            {possoApprovare ? t.rinnovi.approva.inAttesa : t.rinnovi.approva.inAttesaAltri}
          </ThemedText>
          {renewal.requested_at && (
            <ThemedText tone="muted" variant="caption">
              {t.rinnovi.approva.richiestoIl(formatDateIT(renewal.requested_at.slice(0, 10)))}
            </ThemedText>
          )}
        </Card>
      )}

      {possoApprovare && <BloccoApprovazione renewal={renewal} />}

      <RenewalForm
        initial={renewal}
        submitLabel={t.rinnovi.form.salva}
        loading={update.isPending}
        onSubmit={(input) =>
          update.mutate({ id: renewal.id, ...input }, { onSuccess: () => router.back() })
        }
      />

      {!possoApprovare && (
        <ThemedText tone="muted" variant="caption">
          {t.rinnovi.form.avvisoRichiesta}
        </ThemedText>
      )}

      {update.isError && (
        <ThemedText tone="error" variant="caption">
          {update.error instanceof Error ? update.error.message : t.rinnovi.form.salvataggioFallito}
        </ThemedText>
      )}

      <Storico righe={storico ?? []} />

      <Button
        title={t.rinnovi.form.elimina}
        variant="secondary"
        loading={remove.isPending}
        onPress={() =>
          confermaEliminazione(() => remove.mutate(renewal.id, { onSuccess: () => router.back() }))
        }
      />
    </Screen>
  );
}

/**
 * Le date proposte a chi approva. Non decidiamo noi: quando il rinnovo è molto
 * arretrato mostriamo entrambe le strade e lasciamo scegliere.
 */
function BloccoApprovazione({ renewal }: { renewal: Renewal }) {
  const approve = useApproveRenewal();
  const opz = opzioniRinnovo(renewal.current_due_date, renewal.interval_days);
  const [scelta, setScelta] = useState<string>(opz.coincidono ? opz.unPeriodo : opz.recupero);

  return (
    <Card style={{ gap: spacing.md }}>
      <ThemedText variant="heading">{t.rinnovi.approva.titolo}</ThemedText>

      <ThemedText tone="muted" variant="caption">
        {opz.serveConferma
          ? t.rinnovi.approva.spiegaRitardo(opz.periodiDiRitardo)
          : t.rinnovi.approva.spiegaSomma}
      </ThemedText>

      {opz.coincidono ? (
        <ThemedText variant="heading" tone="gold">
          {formatDateIT(opz.unPeriodo)}
        </ThemedText>
      ) : (
        <View style={styles.scelte}>
          <Opzione
            label={t.rinnovi.approva.unPeriodo(formatDateIT(opz.unPeriodo), renewal.interval_days)}
            selected={scelta === opz.unPeriodo}
            onPress={() => setScelta(opz.unPeriodo)}
          />
          <Opzione
            label={t.rinnovi.approva.recupero(formatDateIT(opz.recupero))}
            selected={scelta === opz.recupero}
            onPress={() => setScelta(opz.recupero)}
          />
        </View>
      )}

      {approve.isError && (
        <ThemedText tone="error" variant="caption">
          {approve.error instanceof Error ? approve.error.message : t.rinnovi.form.salvataggioFallito}
        </ThemedText>
      )}

      <Button
        title={t.rinnovi.approva.conferma}
        loading={approve.isPending}
        onPress={() =>
          approve.mutate({ id: renewal.id, nuovaScadenza: opz.coincidono ? opz.unPeriodo : scelta })
        }
      />
    </Card>
  );
}

function Opzione({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? colors.gold : colors.border,
        backgroundColor: selected ? colors.surfaceAlt : colors.surface,
      }}
    >
      <ThemedText variant="caption" style={{ color: selected ? colors.gold : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Storico({ righe }: { righe: RenewalHistoryEntry[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="label" tone="muted">
        {t.rinnovi.storico.titolo}
      </ThemedText>

      {righe.length === 0 ? (
        <ThemedText tone="muted" variant="caption">
          {t.rinnovi.storico.vuoto}
        </ThemedText>
      ) : (
        righe.map((r) => (
          <Card key={r.id} style={{ gap: spacing.xs }}>
            <View style={styles.storicoHeader}>
              <ThemedText variant="caption" style={{ flex: 1 }}>
                {t.rinnovi.storico.azione[r.action]}
              </ThemedText>
              <ThemedText tone="muted" variant="caption">
                {formatDateIT(r.created_at.slice(0, 10))}
              </ThemedText>
            </View>
            {r.old_due_date && r.new_due_date && r.old_due_date !== r.new_due_date && (
              <ThemedText tone="muted" variant="caption">
                {t.rinnovi.storico.da(formatDateIT(r.old_due_date), formatDateIT(r.new_due_date))}
              </ThemedText>
            )}
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scelte: {
    gap: spacing.sm,
  },
  storicoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
