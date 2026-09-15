import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { CardCondivisibile } from '@/components/CardCondivisibile';
import { ProgressBar } from '@/components/ProgressBar';
import { RankBadge } from '@/components/RankBadge';
import { Button, Card, TextField, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { costruisciCard, verificaTesto } from '@/lib/condivisione';
import { condividiCard, condivisioneCardDisponibile } from '@/lib/condivisione-share';
import { messaggioErrore } from '@/lib/errori';
import { useMyStats } from '@/lib/leaderboard';
import { useRankRules } from '@/lib/rank-rules';
import { progressoVersoProssimo, rankLabel } from '@/lib/rank';
import { spacing } from '@/theme';

export function Livello() {
  const stats = useMyStats();
  const { data: regole } = useRankRules();

  const me = stats.data;
  const punti = me?.punti ?? 0;
  const progresso = progressoVersoProssimo(punti, me?.punti_al_prossimo ?? null);
  const alMassimo = me?.punti_al_prossimo == null;

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Il tuo rank */}
      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="label" tone="muted">
          {t.rank.tuoRank}
        </ThemedText>

        {stats.isLoading ? (
          <ThemedText tone="muted">{t.rank.calcolo}</ThemedText>
        ) : stats.isError ? (
          <ThemedText tone="error" variant="caption">
            {messaggioErrore(stats.error, t.comune.errore)}
          </ThemedText>
        ) : me ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <RankBadge rank={me.tier_name} size={72} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <ThemedText variant="title" tone="gold">
                  {rankLabel(me.tier_name)}
                </ThemedText>
                <ThemedText tone="muted" variant="caption">
                  {t.rank.punti(punti)}
                </ThemedText>
              </View>
            </View>

            <ProgressBar percent={progresso * 100} height={7} />

            <ThemedText tone="muted" variant="caption">
              {alMassimo
                ? t.rank.massimo
                : t.rank.prossimo(rankLabel(me.prossimo_tier!), me.punti_al_prossimo!)}
            </ThemedText>

            {/* Le quattro metriche scomposte, coi pesi che valgono adesso */}
            <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
              <ThemedText variant="label" tone="muted">
                {t.rank.comeSiCalcola}
              </ThemedText>
              <Metrica nome="lezioni_completate" valore={me.lezioni_completate} regole={regole} />
              <Metrica nome="clienti_attivi" valore={me.clienti_attivi} regole={regole} />
              <Metrica nome="rinnovi_attivi" valore={me.rinnovi_attivi} regole={regole} />
              <Metrica nome="clienti_acquisiti" valore={me.clienti_acquisiti} regole={regole} />
            </View>
          </>
        ) : null}
      </Card>

      {/* Condivisione: la card esce dall'app, quindi cosa ci va sopra è deciso
          da `condivisione.ts` e non da questa schermata. */}
      {me && <CondividiTraguardo rank={rankLabel(me.tier_name)} punti={punti} />}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        {t.rank.disclaimer}
      </ThemedText>
    </View>
  );
}

/** Una metrica con quanto vale adesso: il peso arriva dal database, non dal codice. */
function Metrica({
  nome,
  valore,
  regole,
}: {
  nome: keyof typeof t.rank.metriche;
  valore: number;
  regole: Map<string, number> | undefined;
}) {
  const peso = regole?.get(nome);
  const contribuisce = peso != null && peso > 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <ThemedText tone="muted" variant="caption" style={{ flex: 1 }}>
        {t.rank.metriche[nome]}
      </ThemedText>
      <ThemedText tone="muted" variant="caption">
        {contribuisce ? `${valore} × ${peso}` : `${valore} · ${t.rank.pesoNullo}`}
      </ThemedText>
      {contribuisce && (
        <ThemedText variant="label" tone="gold" style={{ width: 56, textAlign: 'right' }}>
          {Math.round(valore * peso)}
        </ThemedText>
      )}
    </View>
  );
}

/**
 * Anteprima della card e condivisione.
 *
 * La didascalia si controlla PRIMA di generare l'immagine: se contiene una
 * promessa di guadagno il pulsante resta spento, e il motivo si legge. Bloccare
 * dopo, con l'immagine già pronta, insegnerebbe solo a riprovare finché passa.
 */
function CondividiTraguardo({ rank, punti }: { rank: string; punti: number }) {
  const riferimento = useRef<View>(null);
  const [didascalia, setDidascalia] = useState('');
  const [disponibile, setDisponibile] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const card = useMemo(() => costruisciCard({ tipo: 'rank', rank, punti }), [rank, punti]);
  const esito = useMemo(() => verificaTesto(didascalia), [didascalia]);

  useEffect(() => {
    let vivo = true;
    void condivisioneCardDisponibile().then((ok) => {
      if (vivo) setDisponibile(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!disponibile) return null;

  async function condividi() {
    setErrore(null);
    setInCorso(true);
    const r = await condividiCard(riferimento, 'rank');
    setInCorso(false);
    if (r.esito === 'errore') setErrore(r.motivo);
  }

  return (
    <Card style={{ gap: spacing.md, alignItems: 'center' }}>
      <ThemedText variant="label" tone="muted">
        {t.condivisione.titolo}
      </ThemedText>

      {/* Disegnata a 1080×1920 e ridotta: catturarla piccola darebbe una PNG sgranata */}
      <CardCondivisibile ref={riferimento} card={card} scala={0.16} />

      <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
        <TextField
          label={t.condivisione.didascalia}
          value={didascalia}
          onChangeText={setDidascalia}
          placeholder={t.condivisione.didascaliaEsempio}
          multiline
        />
        {!esito.ok && (
          <ThemedText tone="error" variant="caption">
            {t.condivisione.bloccato[esito.motivo]} {t.condivisione.frase(esito.frase)}
          </ThemedText>
        )}
        <ThemedText tone="muted" variant="caption">
          {t.condivisione.perche}
        </ThemedText>
      </View>

      <Button
        title={t.condivisione.condividi}
        disabled={!esito.ok}
        loading={inCorso}
        onPress={() => void condividi()}
        style={{ alignSelf: 'stretch' }}
      />
      {errore && (
        <ThemedText tone="error" variant="caption">
          {errore}
        </ThemedText>
      )}
    </Card>
  );
}
