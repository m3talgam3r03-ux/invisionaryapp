import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, Screen, TextField, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { parseLocaleNumber } from '@/lib/calculators';
import { formatNumber } from '@/lib/format';
import { etaCambio, useCambio, useInstruments, type StrumentoDB } from '@/lib/instruments';
import { arrotondaAlPassoBroker, calcolaLottaggio } from '@/lib/position-size';
import { radius, spacing, useTheme } from '@/theme';

/** Passo minimo tipico dei broker retail. */
const PASSO_LOTTI = 0.01;

export default function Lottaggio() {
  const { data: strumenti, isLoading } = useInstruments();
  const [simbolo, setSimbolo] = useState<string | null>(null);
  const [equity, setEquity] = useState('10000');
  const [valutaConto, setValutaConto] = useState('EUR');
  const [rischio, setRischio] = useState('1');
  const [stop, setStop] = useState('20');
  const [override, setOverride] = useState('');
  const [cambioManuale, setCambioManuale] = useState('');

  const strumento: StrumentoDB | undefined = useMemo(() => {
    if (!strumenti?.length) return undefined;
    return strumenti.find((s) => s.symbol === simbolo) ?? strumenti[0];
  }, [strumenti, simbolo]);

  const cambio = useCambio(strumento?.quoteCurrency, valutaConto);
  const unita = strumento?.unita ?? 'pip';

  // Se il cambio non c'è si usa quello inserito a mano, mai un valore inventato.
  const tasso = cambio.data?.mancante
    ? parseLocaleNumber(cambioManuale)
    : (cambio.data?.rate ?? NaN);

  const risultato = useMemo(() => {
    if (!strumento) return null;
    const contract = override.trim() ? parseLocaleNumber(override) : null;
    return calcolaLottaggio({
      equity: parseLocaleNumber(equity),
      rischioPercento: parseLocaleNumber(rischio),
      stopPip: parseLocaleNumber(stop),
      strumento,
      valutaConto: valutaConto.trim() || 'EUR',
      quoteToAccountRate: tasso,
      contractSizeOverride: contract,
    });
  }, [strumento, equity, rischio, stop, valutaConto, tasso, override]);

  const lottiBroker = risultato ? arrotondaAlPassoBroker(risultato.lotti, PASSO_LOTTI) : 0;
  const valuta = (valutaConto.trim() || 'EUR').toUpperCase();

  if (isLoading) {
    return (
      <Screen>
        <ThemedText tone="muted">{t.lottaggio.caricamentoStrumenti}</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* Il risultato in cima: è la risposta che si sta cercando */}
      <Card style={{ gap: spacing.xs, alignItems: 'center' }}>
        <ThemedText variant="label" tone="muted">
          {t.lottaggio.risultato}
        </ThemedText>
        {risultato ? (
          <>
            <ThemedText tone="gold" style={styles.grande}>
              {lottiBroker > 0 ? formatNumber(lottiBroker, 2) : '—'}
            </ThemedText>
            <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
              {t.lottaggio.rischiando(formatNumber(risultato.rischioValuta, 2), valuta)}
            </ThemedText>
            {lottiBroker === 0 && (
              <ThemedText tone="error" variant="caption" style={{ textAlign: 'center' }}>
                {t.lottaggio.sottoMinimo}
              </ThemedText>
            )}
          </>
        ) : (
          <ThemedText tone="muted">{t.lottaggio.incompleto}</ThemedText>
        )}
      </Card>

      {/* Strumento: l'elenco arriva dal database, non dal codice */}
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.lottaggio.strumento}
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {(strumenti ?? []).map((s) => (
            <Chip
              key={s.id}
              label={s.symbol}
              selezionato={strumento?.symbol === s.symbol}
              onPress={() => setSimbolo(s.symbol)}
            />
          ))}
        </ScrollView>
      </View>

      {/* La conversione, spiegata invece che nascosta */}
      {strumento && (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="label" tone="muted">
            {t.lottaggio.conversione}
          </ThemedText>
          {risultato?.stessaValuta ? (
            <ThemedText tone="muted" variant="caption">
              {t.lottaggio.stessaValuta}
            </ThemedText>
          ) : (
            <>
              <ThemedText tone="muted" variant="caption">
                {t.lottaggio.conversioneSpiega(strumento.quoteCurrency, valuta, unita)}
              </ThemedText>
              {cambio.data?.mancante ? (
                <>
                  {Number.isFinite(tasso) && tasso > 0 ? (
                    <ThemedText tone="muted" variant="caption">
                      {t.lottaggio.cambioAMano(
                        strumento.quoteCurrency,
                        formatNumber(tasso, 4),
                        valuta,
                      )}
                    </ThemedText>
                  ) : (
                    <ThemedText tone="error" variant="caption">
                      {t.lottaggio.cambioMancante}
                    </ThemedText>
                  )}
                  <TextField
                    label={`${t.lottaggio.cambioManuale} ${strumento.quoteCurrency} → ${valuta}`}
                    value={cambioManuale}
                    onChangeText={setCambioManuale}
                    keyboardType="decimal-pad"
                    placeholder="1,00"
                  />
                </>
              ) : (
                <ThemedText tone="muted" variant="caption">
                  1 {strumento.quoteCurrency} = {formatNumber(cambio.data?.rate ?? 1, 4)} {valuta}
                  {cambio.data?.minutiFa != null ? ` · ${etaCambio(cambio.data.minutiFa)}` : ''}
                </ThemedText>
              )}
            </>
          )}
        </Card>
      )}

      {/* Ingressi */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 2 }}>
          <TextField
            label={t.lottaggio.equity}
            value={equity}
            onChangeText={setEquity}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label={t.lottaggio.valutaConto}
            value={valutaConto}
            onChangeText={setValutaConto}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label={t.lottaggio.rischio}
            value={rischio}
            onChangeText={setRischio}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label={t.lottaggio.stop(unita)}
            value={stop}
            onChangeText={setStop}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Override della dimensione contratto: serve su indici e metalli */}
      {strumento && strumento.tipo !== 'forex' && (
        <View style={{ gap: spacing.xs }}>
          <TextField
            label={t.lottaggio.contractOverride}
            value={override}
            onChangeText={setOverride}
            keyboardType="decimal-pad"
            placeholder={String(strumento.contractSize)}
          />
          <ThemedText tone="muted" variant="caption">
            {t.lottaggio.contractOverrideSpiega}
          </ThemedText>
        </View>
      )}

      {/* Dettaglio */}
      {risultato && strumento && (
        <Card style={{ gap: spacing.xs }}>
          <Riga
            etichetta={t.lottaggio.valorePip(unita)}
            valore={`${formatNumber(risultato.valorePipConto, 4)} ${valuta}`}
          />
          <Riga
            etichetta={t.lottaggio.unitaTotali}
            valore={formatNumber(risultato.unita, strumento.contractSize >= 100 ? 0 : 2)}
          />
          <Riga
            etichetta={t.lottaggio.perditaAlloStop}
            valore={`${formatNumber(
              lottiBroker * parseLocaleNumber(stop) * risultato.valorePipConto,
              2,
            )} ${valuta}`}
          />
        </Card>
      )}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        {t.lottaggio.disclaimer}
      </ThemedText>
    </Screen>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <ThemedText tone="muted" variant="caption" style={{ flex: 1 }}>
        {etichetta}
      </ThemedText>
      <ThemedText variant="caption">{valore}</ThemedText>
    </View>
  );
}

function Chip({
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
  grande: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
