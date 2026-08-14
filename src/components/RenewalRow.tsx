import { Pressable, StyleSheet, View } from 'react-native';

import { Card, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { daysUntil, formatDateIT } from '@/lib/date';
import { spacing } from '@/theme';
import type { RenewalWithClient } from '@/types/models';

type Props = {
  renewal: RenewalWithClient;
  /** Entro quanti giorni la scadenza si evidenzia in oro. */
  giorniPreavviso: number;
  onPress: () => void;
};

/** Una riga dello scadenzario: titolo, urgenza a colori, data e stato. */
export function RenewalRow({ renewal, giorniPreavviso, onPress }: Props) {
  const giorni = daysUntil(renewal.current_due_date);
  const attivo = renewal.status === 'attivo';
  const inAttesa = renewal.status === 'in_attesa_approvazione';

  // L'urgenza colora solo ciò che è davvero in corso: un rinnovo annullato
  // scaduto da mesi non deve gridare in rosso.
  let tono: 'error' | 'gold' | 'muted' = 'muted';
  let testo: string;
  if (giorni < 0) {
    tono = attivo ? 'error' : 'muted';
    testo = t.rinnovi.urgenza.scadutoDa(Math.abs(giorni));
  } else if (giorni === 0) {
    tono = attivo ? 'error' : 'muted';
    testo = t.rinnovi.urgenza.scadeOggi;
  } else {
    tono = attivo && giorni <= giorniPreavviso ? 'gold' : 'muted';
    testo = t.rinnovi.urgenza.tra(giorni);
  }

  const titolo = renewal.client?.nome ?? renewal.prodotto ?? 'Rinnovo';
  const mostraStato = !attivo;

  return (
    <Pressable
        accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={{ gap: spacing.xs }}>
        <View style={styles.header}>
          <ThemedText variant="heading" style={{ flex: 1 }}>
            {titolo}
          </ThemedText>
          <ThemedText tone={tono} variant="label">
            {testo}
          </ThemedText>
        </View>

        <ThemedText tone="muted" variant="caption">
          {formatDateIT(renewal.current_due_date)}
          {renewal.prodotto && renewal.client?.nome ? ` · ${renewal.prodotto}` : ''}
        </ThemedText>

        {mostraStato && (
          <ThemedText tone={inAttesa ? 'accent' : 'muted'} variant="caption">
            {t.rinnovi.stato[renewal.status]}
          </ThemedText>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
