import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { ProgressBar } from '@/components/ProgressBar';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { formatNumber } from '@/lib/format';
import {
  avanzamento,
  impedimento,
  prossimoObiettivo,
  puntiMancanti,
  saldoIncoerente,
  segno,
  type Premio,
} from '@/lib/premi';
import {
  useCatalogo,
  useMieiRiscatti,
  useRegistroPunti,
  useRiscatta,
  useSaldoPunti,
} from '@/lib/premi-data';
import { spacing, useTheme } from '@/theme';

export default function Premi() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const userId = profile?.id;

  const { data: saldo = 0 } = useSaldoPunti(userId);
  const { data: registro } = useRegistroPunti(userId);
  const { data: catalogo, isLoading } = useCatalogo();
  const { data: riscatti } = useMieiRiscatti(userId);
  const riscatta = useRiscatta();

  const [messaggio, setMessaggio] = useState<{ testo: string; errore: boolean } | null>(null);

  const obiettivo = useMemo(() => prossimoObiettivo(catalogo ?? [], saldo), [catalogo, saldo]);
  const incoerente = registro ? saldoIncoerente(saldo, registro) : false;

  async function riscattaPremio(p: Premio) {
    setMessaggio(null);
    try {
      await riscatta.mutateAsync(p.id);
      setMessaggio({ testo: t.premi.riscattato, errore: false });
    } catch (err) {
      setMessaggio({ testo: messaggioErrore(err), errore: true });
    }
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* Il podio e la classifica stanno in Trading: è lì che i punti si
          vincono, e una classifica lontana da dove nasce non si guarda. */}
      <Button
        title={t.premi.vaiAllaClassifica}
        variant="secondary"
        onPress={() => router.push('/trading/classifica')}
      />

      {/* Il saldo, e subito la cosa che si fraintende sempre */}
      <Card style={{ gap: spacing.xs, alignItems: 'center' }}>
        <ThemedText variant="label" tone="muted">
          {t.premi.saldo}
        </ThemedText>
        <ThemedText tone="gold" style={styles.grande}>
          {formatNumber(saldo, 0)}
        </ThemedText>
        <ThemedText tone="muted" variant="caption" style={styles.centro}>
          {t.premi.diversiDalRank}
        </ThemedText>
      </Card>

      {incoerente && (
        <ThemedText tone="error" variant="caption">
          {t.premi.saldoIncoerente}
        </ThemedText>
      )}

      {messaggio && (
        <ThemedText tone={messaggio.errore ? 'error' : 'success'} variant="caption">
          {messaggio.testo}
        </ThemedText>
      )}

      {/* Il prossimo traguardo: quello subito dopo, non il più costoso */}
      {obiettivo && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="label" tone="muted">
            {t.premi.obiettivo}
          </ThemedText>
          <Card style={{ gap: spacing.sm }}>
            <ThemedText>{obiettivo.nome}</ThemedText>
            <ProgressBar percent={avanzamento(obiettivo, saldo) * 100} />
            <ThemedText tone="muted" variant="caption">
              {t.premi.mancano(formatNumber(puntiMancanti(obiettivo, saldo), 0), obiettivo.nome)}
            </ThemedText>
          </Card>
        </View>
      )}

      {/* Catalogo */}
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.premi.catalogo}
        </ThemedText>
        {isLoading ? (
          <ThemedText tone="muted" variant="caption">
            {t.comune.caricamento}
          </ThemedText>
        ) : (catalogo ?? []).length === 0 ? (
          <ThemedText tone="muted" variant="caption">
            {t.premi.catalogoVuoto}
          </ThemedText>
        ) : (
          (catalogo ?? []).map((p) => {
            const blocco = impedimento(p, saldo);
            return (
              <Card key={p.id} style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <ThemedText style={{ flex: 1 }}>{p.nome}</ThemedText>
                  <ThemedText tone="gold" variant="label">
                    {t.premi.costo(formatNumber(p.costoPunti, 0))}
                  </ThemedText>
                </View>
                {p.descrizione ? (
                  <ThemedText tone="muted" variant="caption">
                    {p.descrizione}
                  </ThemedText>
                ) : null}
                <ThemedText tone="muted" variant="caption">
                  {p.disponibili === null ? t.premi.senzaLimite : t.premi.rimasti(p.disponibili)}
                </ThemedText>

                {blocco === null ? (
                  <Button
                    title={t.premi.riscatta}
                    loading={riscatta.isPending}
                    onPress={() => void riscattaPremio(p)}
                  />
                ) : (
                  <ThemedText tone="muted" variant="caption">
                    {blocco === 'esaurito'
                      ? t.premi.esaurito
                      : blocco === 'punti_insufficienti'
                        ? `${t.premi.puntiInsufficienti} · ${t.premi.costo(
                            formatNumber(puntiMancanti(p, saldo), 0),
                          )}`
                        : t.premi.esaurito}
                  </ThemedText>
                )}
              </Card>
            );
          })
        )}
      </View>

      {/* I riscatti fatti */}
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.premi.mieiRiscatti}
        </ThemedText>
        {(riscatti ?? []).length === 0 ? (
          <ThemedText tone="muted" variant="caption">
            {t.premi.nessunRiscatto}
          </ThemedText>
        ) : (
          (riscatti ?? []).map((r) => (
            <View
              key={r.id}
              style={[styles.riga, { borderBottomColor: colors.border }]}
            >
              <ThemedText variant="caption" style={{ flex: 1 }}>
                {r.premioNome}
              </ThemedText>
              <ThemedText variant="caption" tone={r.stato === 'rifiutata' ? 'error' : 'muted'}>
                {t.premi.stato[r.stato] ?? r.stato}
              </ThemedText>
            </View>
          ))
        )}
      </View>

      {/* Il registro: è ciò che spiega il saldo */}
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.premi.movimenti}
        </ThemedText>
        {(registro ?? []).length === 0 ? (
          <ThemedText tone="muted" variant="caption">
            {t.premi.nessunMovimento}
          </ThemedText>
        ) : (
          (registro ?? []).map((v) => (
            <View key={v.id} style={[styles.riga, { borderBottomColor: colors.border }]}>
              <ThemedText variant="caption" tone="muted" style={{ flex: 1 }}>
                {descrizioneVoce(v.origine, v.motivo)}
              </ThemedText>
              <ThemedText variant="caption" tone={v.delta < 0 ? 'default' : 'gold'}>
                {segno(v.delta)}
              </ThemedText>
            </View>
          ))
        )}
      </View>

      <ThemedText tone="muted" variant="caption" style={styles.centro}>
        {t.premi.disclaimer}
      </ThemedText>
    </Screen>
  );
}

/** «Maturati · Lezioni completate», con il motivo tradotto quando è una metrica. */
function descrizioneVoce(origine: string, motivo: string | null): string {
  const testa = t.premi.origine[origine] ?? origine;
  if (!motivo) return testa;
  return `${testa} · ${t.premi.metrica[motivo] ?? motivo}`;
}

function messaggioErrore(err: unknown): string {
  const testo = String((err as { message?: string })?.message ?? '').toLowerCase();
  if (testo.includes('esaurito') || testo.includes('non disponibile')) return t.premi.erroreEsaurito;
  // Il CHECK su points_balance: il saldo sarebbe andato sotto zero.
  if (testo.includes('saldo') || testo.includes('points_balance') || testo.includes('check')) {
    return t.premi.errorePunti;
  }
  return t.premi.erroreGenerico;
}

const styles = StyleSheet.create({
  grande: { fontSize: 40, fontWeight: '800', lineHeight: 46 },
  centro: { textAlign: 'center' },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
