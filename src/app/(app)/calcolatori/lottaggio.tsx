import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Card, Screen, TextField, ThemedText } from '@/components/ui';
import { computePositionSize, parseLocaleNumber, pipSizeForPair } from '@/lib/calculators';
import { formatNumber } from '@/lib/format';
import { spacing } from '@/theme';

export default function Lottaggio() {
  const [saldo, setSaldo] = useState('10000');
  const [valuta, setValuta] = useState('EUR');
  const [rischio, setRischio] = useState('1');
  const [coppia, setCoppia] = useState('EUR/USD');
  const [stopLoss, setStopLoss] = useState('20');
  const [tasso, setTasso] = useState('1');

  const result = useMemo(
    () =>
      computePositionSize({
        balance: parseLocaleNumber(saldo),
        riskPercent: parseLocaleNumber(rischio),
        stopLossPips: parseLocaleNumber(stopLoss),
        pipSize: pipSizeForPair(coppia),
        quoteToAccountRate: parseLocaleNumber(tasso),
      }),
    [saldo, rischio, stopLoss, coppia, tasso],
  );

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <TextField label="Saldo conto" value={saldo} onChangeText={setSaldo} keyboardType="decimal-pad" />
      <TextField label="Valuta conto" value={valuta} onChangeText={setValuta} autoCapitalize="characters" />
      <TextField label="Rischio %" value={rischio} onChangeText={setRischio} keyboardType="decimal-pad" />
      <TextField label="Coppia" value={coppia} onChangeText={setCoppia} autoCapitalize="characters" placeholder="EUR/USD" />
      <TextField label="Stop loss (pips)" value={stopLoss} onChangeText={setStopLoss} keyboardType="decimal-pad" />
      <TextField
        label="Tasso valuta quotata → conto"
        value={tasso}
        onChangeText={setTasso}
        keyboardType="decimal-pad"
      />
      <ThemedText tone="muted" variant="caption">
        Se la valuta quotata (dopo la «/») coincide con la valuta del conto, lascia 1. La dimensione
        pip è {formatNumber(pipSizeForPair(coppia), 4)} per questa coppia.
      </ThemedText>

      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="label" tone="muted">
          Risultato
        </ThemedText>
        {result ? (
          <>
            <ResultRow label="Rischio" value={`${formatNumber(result.riskAmount)} ${valuta}`} />
            <ResultRow
              label="Valore pip / lotto"
              value={`${formatNumber(result.pipValuePerLotAccount)} ${valuta}`}
            />
            <ResultRow label="Lotti (standard)" value={formatNumber(result.lots, 2)} accent />
            <ResultRow label="Unità" value={formatNumber(result.units, 0)} />
          </>
        ) : (
          <ThemedText tone="muted">Compila i campi con valori validi (&gt; 0).</ThemedText>
        )}
      </Card>

      <ThemedText tone="muted" variant="caption">
        Stima a scopo educativo, non consulenza finanziaria. Verifica sempre il valore pip e le
        condizioni del tuo broker.
      </ThemedText>
    </Screen>
  );
}

function ResultRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
      <ThemedText tone="muted">{label}</ThemedText>
      <ThemedText variant={accent ? 'heading' : 'body'} tone={accent ? 'gold' : 'default'}>
        {value}
      </ThemedText>
    </View>
  );
}
