import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { domandeRimaste, statoBudget } from '@/lib/agente';
import { useBudgetAgente, useDimentica, useDimenticaTutto, useMemorie } from '@/lib/agente-data';
import { spacing, useTheme } from '@/theme';

/**
 * Quello che l'agente ricorda, e quanto se ne sta usando.
 *
 * Due cose che di solito un'app non mostra, e che qui si mostrano di proposito:
 * i propri appunti (perché sono tuoi e devi poterli cancellare) e il consumo
 * (perché c'è un tetto, e scoprirlo sbattendoci contro è il modo peggiore).
 */
export default function MemoriaAgente() {
  const { colors } = useTheme();
  const { data: memorie, isLoading } = useMemorie();
  const { data: budget } = useBudgetAgente();
  const dimentica = useDimentica();
  const dimenticaTutto = useDimenticaTutto();
  const [confermaAperta, setConfermaAperta] = useState(false);

  const rimaste = budget ? domandeRimaste(budget) : null;
  const stato = budget ? statoBudget(budget) : 'ok';

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* Il consumo: si vede prima di sbatterci contro */}
      {budget && (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="muted">
            {t.agente.budget}
          </ThemedText>
          <ThemedText tone={stato === 'esaurito' ? 'error' : stato === 'quasi' ? 'gold' : 'default'}>
            {rimaste === null
              ? t.agente.domandeSenzaLimite(budget.richiesteOggi)
              : t.agente.domandeOggi(budget.richiesteOggi, budget.richiesteMax)}
          </ThemedText>
          {stato === 'quasi' && (
            <ThemedText tone="muted" variant="caption">
              {t.agente.budgetQuasi}
            </ThemedText>
          )}
          {stato === 'esaurito' && (
            <ThemedText tone="error" variant="caption">
              {t.agente.limiteGiornaliero}
            </ThemedText>
          )}
        </Card>
      )}

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.agente.memoriaTitolo}
        </ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.agente.memoriaPrivata}
        </ThemedText>
      </View>

      {isLoading ? (
        <ThemedText tone="muted">{t.comune.caricamento}</ThemedText>
      ) : (memorie ?? []).length === 0 ? (
        <ThemedText tone="muted" variant="caption">
          {t.agente.memoriaVuota}
        </ThemedText>
      ) : (
        <>
          {(memorie ?? []).map((m) => (
            <Card key={m.id} style={{ gap: spacing.xs }}>
              <ThemedText tone="gold" variant="label">
                {t.agente.categoria[m.categoria] ?? m.categoria}
              </ThemedText>
              <ThemedText>{m.fatto}</ThemedText>
              <Button
                title={t.agente.dimentica}
                variant="secondary"
                loading={dimentica.isPending}
                onPress={() => dimentica.mutate(m.id)}
              />
            </Card>
          ))}

          <View style={[styles.separatore, { borderTopColor: colors.border }]} />

          {confermaAperta ? (
            <Card style={{ gap: spacing.sm }}>
              <ThemedText tone="error" variant="caption">
                {t.agente.confermaTutto}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  title={t.agente.dimenticaTutto}
                  style={{ flex: 1 }}
                  loading={dimenticaTutto.isPending}
                  onPress={() => {
                    dimenticaTutto.mutate();
                    setConfermaAperta(false);
                  }}
                />
                <Button
                  title={t.comune.annulla}
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setConfermaAperta(false)}
                />
              </View>
            </Card>
          ) : (
            <Button
              title={t.agente.dimenticaTutto}
              variant="secondary"
              onPress={() => setConfermaAperta(true)}
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  separatore: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm },
});
