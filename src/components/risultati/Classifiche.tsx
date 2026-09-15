import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Podio } from '@/components/Podio';
import { RankBadge } from '@/components/RankBadge';
import { Card, Sezione, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { messaggioErrore } from '@/lib/errori';
import { formatNumber } from '@/lib/format';
import { etichettaMese, mesePrecedente, posizioniPremiate, puntiPerPosizione } from '@/lib/podio';
import { usePodio, useRegolePunti } from '@/lib/premi-data';
import { useLeaderboard, type LeaderboardEntry } from '@/lib/leaderboard';
import { formaClassifica } from '@/lib/rank';
import { useTraderLeaderboard, type TraderRanking } from '@/lib/trading';
import { spacing, useTheme } from '@/theme';

/** Soglia mostrata nella spiegazione; il valore vero è in `trading_config`. */
const SOGLIA_INDICATIVA = 20;

/**
 * Chi è avanti, in due modi.
 *
 * ── PERCHÉ STANNO INSIEME ──
 * Erano due schermate in due rami diversi dell'app: la classifica di rete
 * dentro «Rank», la classifica trader dentro «Trading». Rispondono alla stessa
 * domanda — chi è avanti — e chi se la fa non sa in quale dei due rami
 * cercare, perché la risposta dipende da come abbiamo deciso di misurare, che
 * è una scelta nostra e non un suo problema.
 *
 * Insieme, la differenza si legge invece di doverla spiegare: una misura
 * quanto hai costruito, l'altra quanto sei stato preciso.
 */
export function Classifiche() {
  return (
    <View style={{ gap: spacing.xl }}>
      <ClassificaRete />
      <ClassificaTrader />
    </View>
  );
}

/**
 * La classifica di rete, per punti rank.
 *
 * `classifica()` nel database filtra con can_read_member(), quindi un
 * collaboratore riceve solo la propria riga. Disegnarla come una classifica
 * gli mostrava una card sola in posizione 1 col bordo acceso: «sei primo della
 * rete», che non è vero.
 */
function ClassificaRete() {
  const { session } = useAuth();
  const board = useLeaderboard();
  const forma = formaClassifica(board.data, session?.user.id);

  return (
    <View style={{ gap: spacing.sm }}>
      <Sezione
        titolo={forma === 'solo-io' ? t.rank.soloIoTitolo : t.rank.classifica}
        descrizione={t.risultati.reteSpiega}
      />

      {board.isLoading && <ThemedText tone="muted">{t.rank.caricamentoClassifica}</ThemedText>}
      {board.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(board.error, t.comune.errore)}
        </ThemedText>
      )}

      {!board.isLoading && !board.isError && forma === 'vuota' && (
        <ThemedText tone="muted" variant="caption">
          {t.rank.classificaVuota}
        </ThemedText>
      )}

      {forma === 'solo-io' && (
        <ThemedText tone="muted" variant="caption">
          {t.rank.soloIo}
        </ThemedText>
      )}

      {forma === 'classifica' &&
        board.data?.map((m, i) => (
          <RigaRete key={m.user_id} riga={m} posizione={i + 1} io={m.user_id === session?.user.id} />
        ))}
    </View>
  );
}

function RigaRete({
  riga,
  posizione,
  io,
}: {
  riga: LeaderboardEntry;
  posizione: number;
  io: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Card
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderColor: io ? colors.accent : colors.border,
      }}
    >
      <ThemedText tone="muted" variant="label" style={{ width: 22, textAlign: 'center' }}>
        {posizione}
      </ThemedText>
      <RankBadge rank={riga.tier_name} size={40} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="heading">
          {riga.full_name}
          {io ? t.rank.io : ''}
        </ThemedText>
        <ThemedText tone="muted" variant="caption">
          {ROLE_LABEL[riga.role]}
        </ThemedText>
      </View>
      <ThemedText tone="gold" variant="label">
        {Math.round(riga.punti)} pt
      </ThemedText>
    </Card>
  );
}

/** La classifica trader: quota di operazioni chiuse in utile, mai importi. */
function ClassificaTrader() {
  const { data, isLoading, isError, error } = useTraderLeaderboard();
  const { session } = useAuth();

  // Il podio è del mese CHIUSO: quello in corso cambia sotto gli occhi e non
  // direbbe a nessuno chi ha vinto davvero.
  const [mese] = useState(() => mesePrecedente(new Date()));
  const { data: podio } = usePodio(mese);
  const { data: regole } = useRegolePunti();

  const { classificati, esclusi } = useMemo(() => {
    const righe = data ?? [];
    return {
      classificati: righe.filter((r) => r.classificato),
      esclusi: righe.filter((r) => !r.classificato),
    };
  }, [data]);

  return (
    <View style={{ gap: spacing.sm }}>
      <Sezione titolo={t.trading.classifica.titolo} descrizione={t.trading.classifica.sottotitolo} />

      {/* Il podio del mese chiuso, e i punti che si portano a casa */}
      <Card style={{ gap: spacing.md, paddingBottom: 0 }}>
        <ThemedText variant="label" tone="muted">
          {t.podio.titolo(etichettaMese(mese))}
        </ThemedText>
        <Podio voci={podio ?? []} />
      </Card>

      {/* Il ponte fra questa classifica e i premi: i punti nascono qui e si
          spendono nel segmento accanto, quindi va detto qui, non là. */}
      {regole && posizioniPremiate(regole) > 0 && (
        <ThemedText tone="muted" variant="caption">
          {t.podio.comeSiVincono(
            posizioniPremiate(regole),
            formatNumber(puntiPerPosizione(regole, 1), 0),
          )}{' '}
          {t.risultati.puntiVannoNeiPremi}
        </ThemedText>
      )}

      {isLoading && <ThemedText tone="muted">{t.trading.classifica.caricamento}</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(error, t.comune.errore)}
        </ThemedText>
      )}
      {data?.length === 0 && (
        <ThemedText tone="muted" variant="caption">
          {t.trading.classifica.vuota}
        </ThemedText>
      )}

      {classificati.map((r, i) => (
        <RigaTrader
          key={r.user_id}
          riga={r}
          posizione={i + 1}
          io={r.user_id === session?.user.id}
          punti={regole ? puntiPerPosizione(regole, i + 1) : 0}
        />
      ))}

      {/* Chi non ha ancora abbastanza operazioni: mostrato, ma fuori classifica */}
      {esclusi.length > 0 && (
        <>
          <ThemedText variant="label" tone="muted" style={{ marginTop: spacing.md }}>
            {t.trading.classifica.nonClassificati}
          </ThemedText>
          <ThemedText tone="muted" variant="caption">
            {t.trading.classifica.sogliaSpiegazione(SOGLIA_INDICATIVA)}
          </ThemedText>
          {esclusi.map((r) => (
            <RigaTrader key={r.user_id} riga={r} io={r.user_id === session?.user.id} />
          ))}
        </>
      )}

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        {t.trading.classifica.disclaimer}
      </ThemedText>
    </View>
  );
}

function RigaTrader({
  riga,
  posizione,
  io,
  punti = 0,
}: {
  riga: TraderRanking;
  posizione?: number;
  io: boolean;
  /** Punti premio che questa posizione porta a casa. Zero = fuori dai premiati. */
  punti?: number;
}) {
  const { colors } = useTheme();
  // L'oro solo al podio: è la regola del marchio sui traguardi.
  const podio = posizione !== undefined && posizione <= 3;

  return (
    <Card
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderColor: io ? colors.accent : colors.border,
        opacity: posizione === undefined ? 0.75 : 1,
      }}
    >
      <ThemedText
        tone={podio ? 'gold' : 'muted'}
        variant="label"
        style={{ width: 26, textAlign: 'center' }}
      >
        {posizione !== undefined ? t.trading.classifica.posizione(posizione) : '—'}
      </ThemedText>

      <View style={{ flex: 1, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ThemedText variant="heading">{riga.full_name}</ThemedText>
          {riga.vip_call_host && (
            <ThemedText tone="gold" variant="caption">
              ♠ {t.trading.classifica.vipHost}
            </ThemedText>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ThemedText tone="muted" variant="caption">
            {t.trading.classifica.operazioni(riga.operazioni)}
          </ThemedText>
          {punti > 0 && (
            <ThemedText tone="gold" variant="caption">
              · {t.trading.classifica.puntiPosizione(formatNumber(punti, 0))}
            </ThemedText>
          )}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText variant="label" tone={podio ? 'gold' : 'muted'}>
          {formatNumber(riga.win_rate, 1)}%
        </ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.trading.classifica.winRate}
        </ThemedText>
      </View>
    </Card>
  );
}
