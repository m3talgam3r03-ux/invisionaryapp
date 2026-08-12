import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, TextField, ThemedText, Sezione } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { verificaRegola } from '@/lib/booking';
import { useDisponibilita, useEliminaRegola, useSalvaRegola } from '@/lib/calendario';
import { radius, spacing, useTheme } from '@/theme';

export default function Disponibilita() {
  const { profile } = useAuth();
  const { data: regole, isLoading } = useDisponibilita(profile?.id);
  const salva = useSalvaRegola();
  const elimina = useEliminaRegola();

  const [giorno, setGiorno] = useState(1); // lunedì
  const [inizio, setInizio] = useState('09:00');
  const [fine, setFine] = useState('12:00');
  const [durata, setDurata] = useState('30');

  const esito = useMemo(
    () => verificaRegola(inizio, fine, Number(durata)),
    [inizio, fine, durata],
  );

  const anteprima = esito.valida
    ? t.calendario.anteprimaSlot(esito.slotGenerati) +
      (esito.avanzo > 0 ? t.calendario.anteprimaAvanzo(esito.avanzo) : '')
    : motivoInItaliano(esito.motivo);

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText tone="muted" variant="caption">
        {t.calendario.spiegazione}
      </ThemedText>

      {/* Fasce già pubblicate */}
      <View style={{ gap: spacing.sm }}>
        {isLoading ? (
          <ThemedText tone="muted" variant="caption">
            {t.comune.caricamento}
          </ThemedText>
        ) : (regole ?? []).length === 0 ? (
          <ThemedText tone="muted" variant="caption">
            {t.calendario.nessunaFascia}
          </ThemedText>
        ) : (
          (regole ?? []).map((r) => (
            <Card key={r.id} style={{ gap: spacing.xs }}>
              <ThemedText tone="gold" variant="label">
                {t.calendario.giorni[r.giornoSettimana]}
              </ThemedText>
              <ThemedText variant="caption">
                {t.calendario.fasciaDescrizione(
                  r.oraInizio.slice(0, 5),
                  r.oraFine.slice(0, 5),
                  r.durataMinuti,
                )}
              </ThemedText>
              <Button
                title={t.calendario.rimuovi}
                variant="secondary"
                loading={elimina.isPending}
                onPress={() => elimina.mutate(r.id)}
              />
            </Card>
          ))
        )}
        {(regole ?? []).length > 0 && (
          <ThemedText tone="muted" variant="caption">
            {t.calendario.rimuoviAvviso}
          </ThemedText>
        )}
      </View>

      {/* Nuova fascia */}
      <View style={{ gap: spacing.md }}>
        <Sezione titolo={t.calendario.aggiungiFascia} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {t.calendario.giorniBrevi.map((etichetta, indice) => (
            <ChipGiorno
              key={etichetta}
              label={etichetta}
              selezionato={giorno === indice}
              onPress={() => setGiorno(indice)}
            />
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <TextField label={t.calendario.dalle} value={inizio} onChangeText={setInizio} placeholder="09:00" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label={t.calendario.alle} value={fine} onChangeText={setFine} placeholder="12:00" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label={t.calendario.durata}
              value={durata}
              onChangeText={setDurata}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Quanti appuntamenti nascono da questa fascia, prima di salvarla */}
        <ThemedText tone={esito.valida ? 'muted' : 'error'} variant="caption">
          {anteprima}
        </ThemedText>

        <Button
          title={t.calendario.aggiungiFascia}
          disabled={!esito.valida}
          loading={salva.isPending}
          onPress={() =>
            salva.mutate({
              giornoSettimana: giorno,
              oraInizio: inizio,
              oraFine: fine,
              durataMinuti: Number(durata),
            })
          }
        />
        {salva.isError && (
          <ThemedText tone="error" variant="caption">
            {salva.error instanceof Error ? salva.error.message : t.comune.errore}
          </ThemedText>
        )}
      </View>
    </Screen>
  );
}

function motivoInItaliano(motivo: string): string {
  switch (motivo) {
    case 'orario_non_valido':
      return t.calendario.erroreOrario;
    case 'fine_prima_di_inizio':
      return t.calendario.erroreFine;
    case 'durata_non_valida':
      return t.calendario.erroreDurata;
    default:
      return t.calendario.erroreFinestra;
  }
}

function ChipGiorno({
  label,
  selezionato,
  onPress,
}: {
  label: string;
  selezionato: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: selezionato }}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selezionato ? colors.accent : colors.border,
        backgroundColor: selezionato ? colors.accent : colors.surface,
      }}
    >
      <ThemedText variant="caption" style={{ color: selezionato ? '#FFFFFF' : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: spacing.sm },
});
