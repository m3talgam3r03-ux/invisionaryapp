import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Polygon, Polyline } from 'react-native-svg';

import { Card, Screen, TextField, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import {
  computeCompoundInterest,
  parseLocaleNumber,
  serieGrafico,
  type CompoundPoint,
  type PuntoGrafico,
} from '@/lib/calculators';
import { formatNumber } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

const ALTEZZA_GRAFICO = 180;

export default function InteresseComposto() {
  const { colors } = useTheme();
  const [capitale, setCapitale] = useState('5000');
  const [versamento, setVersamento] = useState('200');
  // Vuoto di proposito: un tasso preimpostato è l'app che suggerisce un
  // rendimento. L'ipotesi la sceglie chi usa il calcolatore.
  const [tasso, setTasso] = useState('');
  const [anni, setAnni] = useState('10');

  const capitaleNum = parseLocaleNumber(capitale);
  const tassoVuoto = tasso.trim() === '';

  const result = useMemo(
    () =>
      computeCompoundInterest({
        principal: capitaleNum,
        monthlyContribution: parseLocaleNumber(versamento),
        annualRatePercent: parseLocaleNumber(tasso),
        years: parseLocaleNumber(anni),
      }),
    [capitaleNum, versamento, tasso, anni],
  );

  const serie = useMemo(
    () => (result ? serieGrafico(result.perYear, capitaleNum) : null),
    [result, capitaleNum],
  );

  const quotaInteressi =
    result && result.futureValue > 0 ? (result.totalInterest / result.futureValue) * 100 : 0;

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* Il risultato in cima */}
      <Card style={{ gap: spacing.xs, alignItems: 'center' }}>
        <ThemedText variant="label" tone="muted">
          {t.composto.montante}
        </ThemedText>
        {result ? (
          <>
            <ThemedText tone="gold" style={styles.grande}>
              {formatNumber(result.futureValue)} €
            </ThemedText>
            {result.totalInterest > 0 && (
              <ThemedText tone="muted" variant="caption" style={styles.centro}>
                {t.composto.quotaInteressi(formatNumber(quotaInteressi, 0))}
              </ThemedText>
            )}
          </>
        ) : (
          <ThemedText tone="muted" style={styles.centro}>
            {tassoVuoto ? t.composto.tassoMancante : t.composto.incompleto}
          </ThemedText>
        )}
      </Card>

      {/* Il grafico: due aree impilate, non una curva sola. Una curva sola
          farebbe sembrare che tutta la crescita venga dagli interessi. */}
      {serie && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="label" tone="muted">
            {t.composto.andamento}
          </ThemedText>
          <Card style={{ gap: spacing.md }}>
            <GraficoAree punti={serie.punti} />
            {/* Neutro per i soldi che hai messo, oro per quelli che ha fatto
                il tempo: la distinzione è tutto il senso del grafico. */}
            <View style={styles.legenda}>
              <Voce colore={colors.textMuted} testo={t.composto.legendaVersato} />
              <Voce colore={colors.gold} testo={t.composto.legendaInteressi} />
            </View>
            <ThemedText tone="muted" variant="caption">
              {sorpassoTesto(result!.perYear, capitaleNum)}
            </ThemedText>
          </Card>
        </View>
      )}

      {/* Ingressi */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label={t.composto.capitale}
            value={capitale}
            onChangeText={setCapitale}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label={t.composto.versamento}
            value={versamento}
            onChangeText={setVersamento}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label={t.composto.tasso}
            value={tasso}
            onChangeText={setTasso}
            keyboardType="decimal-pad"
            placeholder="—"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label={t.composto.anni}
            value={anni}
            onChangeText={setAnni}
            keyboardType="number-pad"
          />
        </View>
      </View>
      <ThemedText tone="muted" variant="caption">
        {t.composto.tassoAiuto}
      </ThemedText>

      {result && (
        <Card style={{ gap: spacing.sm }}>
          <Riga etichetta={t.composto.versato} valore={result.totalContributed} />
          <Riga etichetta={t.composto.interessi} valore={result.totalInterest} oro />
        </Card>
      )}

      {/* Anno per anno: il grafico dà la forma, la tabella i numeri */}
      {result && result.perYear.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="label" tone="muted">
            {t.composto.annoPerAnno}
          </ThemedText>
          <Card style={{ gap: 0, paddingVertical: spacing.sm }}>
            <View style={[styles.riga, { borderBottomColor: colors.border }]}>
              <ThemedText variant="caption" tone="muted" style={styles.colAnno}>
                {t.composto.colonnaAnno}
              </ThemedText>
              <ThemedText variant="caption" tone="muted" style={styles.colNum}>
                {t.composto.colonnaVersato}
              </ThemedText>
              <ThemedText variant="caption" tone="muted" style={styles.colNum}>
                {t.composto.colonnaInteressi}
              </ThemedText>
              <ThemedText variant="caption" tone="muted" style={styles.colNum}>
                {t.composto.colonnaTotale}
              </ThemedText>
            </View>
            {result.perYear.map((p) => (
              <View key={p.year} style={[styles.riga, { borderBottomColor: colors.border }]}>
                <ThemedText variant="caption" tone="muted" style={styles.colAnno}>
                  {p.year}
                </ThemedText>
                <ThemedText variant="caption" style={styles.colNum}>
                  {formatNumber(p.contributed, 0)}
                </ThemedText>
                <ThemedText variant="caption" tone="gold" style={styles.colNum}>
                  {formatNumber(p.interest, 0)}
                </ThemedText>
                <ThemedText variant="caption" style={styles.colNum}>
                  {formatNumber(p.balance, 0)}
                </ThemedText>
              </View>
            ))}
          </Card>
        </View>
      )}

      <ThemedText tone="muted" variant="caption">
        {t.composto.disclaimer}
      </ThemedText>
    </Screen>
  );
}

/**
 * Aree impilate. La matematica sta in `serieGrafico()` (0→1), qui si scala.
 *
 * Si misura la larghezza reale invece di usare un `viewBox` unitario con
 * `preserveAspectRatio="none"`: quello stirerebbe anche lo spessore delle
 * linee, rendendole spesse in verticale e sottili in orizzontale.
 */
function GraficoAree({ punti }: { punti: PuntoGrafico[] }) {
  const { colors } = useTheme();
  const [larghezza, setLarghezza] = useState(0);

  const h = ALTEZZA_GRAFICO;
  // In SVG l'origine è in alto: (1 − y) ribalta il grafico nel verso naturale.
  const xy = (x: number, y: number) => `${x * larghezza},${(1 - y) * h}`;

  const versato = punti.map((p) => xy(p.x, p.yVersato)).join(' ');
  const totale = punti.map((p) => xy(p.x, p.yTotale)).join(' ');
  const rovescio = [...punti]
    .reverse()
    .map((p) => xy(p.x, p.yVersato))
    .join(' ');

  return (
    <View
      style={{ height: h }}
      onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel={`${t.composto.legendaVersato} e ${t.composto.legendaInteressi}`}
    >
      {larghezza > 0 && (
        <Svg width={larghezza} height={h}>
          {/* Interessi: la fascia fra la linea del versato e quella del totale */}
          <Polygon points={`${totale} ${rovescio}`} fill={colors.gold} fillOpacity={0.55} />
          {/* Versato: dalla base fino alla sua linea */}
          <Polygon
            points={`0,${h} ${versato} ${larghezza},${h}`}
            fill={colors.textMuted}
            fillOpacity={0.55}
          />
          <Polyline points={totale} fill="none" stroke={colors.gold} strokeWidth={2} />
          <Line x1={0} y1={h} x2={larghezza} y2={h} stroke={colors.border} strokeWidth={1} />
        </Svg>
      )}
    </View>
  );
}

/**
 * Il primo anno in cui gli interessi maturati nell'anno superano il versato
 * dello stesso anno.
 *
 * Il punto di partenza è `{interessi: 0, versato: capitaleIniziale}`, non zero:
 * `contributed` comprende già il capitale iniziale, e partire da zero
 * conterebbe quel capitale come se fosse stato versato nel primo anno.
 */
function sorpassoTesto(perYear: CompoundPoint[], capitaleIniziale: number): string {
  let interessiPrima = 0;
  let versatoPrima = capitaleIniziale;

  for (const anno of perYear) {
    const interessiAnno = anno.interest - interessiPrima;
    const versatoAnno = anno.contributed - versatoPrima;
    if (versatoAnno > 0 && interessiAnno > versatoAnno) {
      return t.composto.sorpasso(anno.year);
    }
    interessiPrima = anno.interest;
    versatoPrima = anno.contributed;
  }
  return t.composto.nessunSorpasso;
}

function Voce({ colore, testo }: { colore: string; testo: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ width: 12, height: 12, borderRadius: radius.sm, backgroundColor: colore }} />
      <ThemedText variant="caption" tone="muted">
        {testo}
      </ThemedText>
    </View>
  );
}

function Riga({
  etichetta,
  valore,
  oro,
}: {
  etichetta: string;
  valore: number;
  oro?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <ThemedText tone="muted" variant="caption" style={{ flex: 1 }}>
        {etichetta}
      </ThemedText>
      <ThemedText tone={oro ? 'gold' : 'default'}>{formatNumber(valore)} €</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  grande: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  centro: { textAlign: 'center' },
  legenda: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colAnno: { width: 42 },
  colNum: { flex: 1, textAlign: 'right' },
});
