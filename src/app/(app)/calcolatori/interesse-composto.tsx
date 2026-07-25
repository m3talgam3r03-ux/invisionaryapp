import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Card, Screen, TextField, ThemedText } from '@/components/ui';
import { computeCompoundInterest, parseLocaleNumber } from '@/lib/calculators';
import { formatNumber } from '@/lib/format';
import { spacing, useTheme } from '@/theme';

export default function InteresseComposto() {
  const { colors } = useTheme();
  const [capitale, setCapitale] = useState('5000');
  const [versamento, setVersamento] = useState('200');
  const [tasso, setTasso] = useState('6');
  const [anni, setAnni] = useState('10');

  const result = useMemo(
    () =>
      computeCompoundInterest({
        principal: parseLocaleNumber(capitale),
        monthlyContribution: parseLocaleNumber(versamento),
        annualRatePercent: parseLocaleNumber(tasso),
        years: parseLocaleNumber(anni),
      }),
    [capitale, versamento, tasso, anni],
  );

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <TextField label="Capitale iniziale (€)" value={capitale} onChangeText={setCapitale} keyboardType="decimal-pad" />
      <TextField label="Versamento mensile (€)" value={versamento} onChangeText={setVersamento} keyboardType="decimal-pad" />
      <TextField label="Tasso annuo %" value={tasso} onChangeText={setTasso} keyboardType="decimal-pad" />
      <TextField label="Anni" value={anni} onChangeText={setAnni} keyboardType="number-pad" />

      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="label" tone="muted">
          Risultato
        </ThemedText>
        {result ? (
          <>
            <ResultRow label="Montante finale" value={`${formatNumber(result.futureValue)} €`} accent />
            <ResultRow label="Totale versato" value={`${formatNumber(result.totalContributed)} €`} />
            <ResultRow label="Interessi maturati" value={`${formatNumber(result.totalInterest)} €`} />
          </>
        ) : (
          <ThemedText tone="muted">Compila i campi con valori validi (anni tra 1 e 100).</ThemedText>
        )}
      </Card>

      {result && result.perYear.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="label" tone="muted">
            Montante per anno
          </ThemedText>
          {result.perYear.map((p) => (
            <View
              key={p.year}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <ThemedText tone="muted" variant="caption">
                Anno {p.year}
              </ThemedText>
              <ThemedText variant="caption">{formatNumber(p.balance)} €</ThemedText>
            </View>
          ))}
        </View>
      )}

      <ThemedText tone="muted" variant="caption">
        Proiezione a scopo educativo, non consulenza finanziaria. Nessuna garanzia di rendimento.
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
