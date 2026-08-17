import { Pressable, StyleSheet, View } from 'react-native';

import { Card, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { useConsents, useSetConsent } from '@/lib/consents';
import { messaggioErrore } from '@/lib/errori';
import { radius, spacing, useTheme } from '@/theme';
import { CANALI, type Canale, type Client } from '@/types/models';

/**
 * Consensi per canale.
 *
 * Tre stati e non due: sì, no, e «mai chiesto». Un interruttore acceso/spento
 * costringerebbe a inventare un valore per chi non è mai stato interpellato, e
 * quel valore finirebbe per sembrare una risposta. «Non registrato» dice la
 * verità e vale come un no.
 */
export function ConsentPanel({ client }: { client: Client }) {
  const { profile } = useAuth();
  const { data: consensi } = useConsents(client.id);
  const setConsent = useSetConsent();

  // Un leader legge la rete ma non dichiara consensi al posto dei suoi
  // collaboratori: sarebbe una firma messa da un altro.
  const puoModificare = client.owner_id === profile?.id || profile?.role === 'admin';

  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="label" tone="muted">
        {t.crm.consensi.titolo}
      </ThemedText>
      <ThemedText tone="muted" variant="caption">
        {t.crm.consensi.sottotitolo}
      </ThemedText>

      <Card style={{ gap: spacing.md }}>
        {CANALI.map((canale) => (
          <RigaCanale
            key={canale}
            canale={canale}
            valore={consensi?.get(canale)?.valore}
            disabilitato={!puoModificare || setConsent.isPending}
            onSet={(valore) =>
              setConsent.mutate({
                clientId: client.id,
                canale,
                valore,
                testoInformativa: t.crm.consensi.informativa,
              })
            }
          />
        ))}
      </Card>

      {/* Un consenso che non si salva è il silenzio peggiore dell'app: si
          tocca «no», il pallino non si muove, e si va via convinti di aver
          revocato. Il contatto resta contattabile, e la prova di quel «no»
          non esiste da nessuna parte. */}
      {setConsent.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(setConsent.error, t.crm.consensi.nonSalvato)}
        </ThemedText>
      )}

      {!puoModificare && (
        <ThemedText tone="muted" variant="caption">
          {t.crm.consensi.soloProprietario}
        </ThemedText>
      )}
    </View>
  );
}

function RigaCanale({
  canale,
  valore,
  disabilitato,
  onSet,
}: {
  canale: Canale;
  /** `undefined` = mai chiesto. */
  valore: boolean | undefined;
  disabilitato: boolean;
  onSet: (valore: boolean) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <ThemedText style={{ flex: 1 }}>{t.crm.consensi.canale[canale]}</ThemedText>

        <Scelta
          label={t.crm.consensi.concesso}
          attiva={valore === true}
          colore={colors.success}
          disabilitato={disabilitato}
          onPress={() => onSet(true)}
        />
        <Scelta
          label={t.crm.consensi.negato}
          attiva={valore === false}
          colore={colors.error}
          disabilitato={disabilitato}
          onPress={() => onSet(false)}
        />
      </View>

      {valore === undefined && (
        <ThemedText tone="muted" variant="caption">
          {t.crm.consensi.spiegaNonRegistrato}
        </ThemedText>
      )}
    </View>
  );
}

function Scelta({
  label,
  attiva,
  colore,
  disabilitato,
  onPress,
}: {
  label: string;
  attiva: boolean;
  colore: string;
  disabilitato: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitato}
      accessibilityRole="radio"
      accessibilityState={{ selected: attiva, disabled: disabilitato }}
      style={{
        minWidth: 44,
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: attiva ? colore : colors.border,
        backgroundColor: attiva ? colore : 'transparent',
        opacity: disabilitato ? 0.5 : 1,
      }}
    >
      <ThemedText variant="caption" style={{ color: attiva ? '#FFFFFF' : colors.textMuted }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
