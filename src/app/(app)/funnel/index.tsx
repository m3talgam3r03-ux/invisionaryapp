import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, TextField, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { CANALI, linkPubblico, slugDaTitolo, slugValido, type Canale } from '@/lib/funnel';
import { useAttivaFunnel, useCreaFunnel, useFunnels, useLead } from '@/lib/funnel-data';
import { radius, spacing, useTheme } from '@/theme';

/** Dove è ospitata la pagina pubblica. L'app non può indovinarlo. */
const BASE_FUNNEL = process.env.EXPO_PUBLIC_FUNNEL_BASE_URL;

const CONSENSO_PREDEFINITO =
  'Acconsento a essere ricontattato per ricevere informazioni sul percorso. ' +
  'I miei dati saranno trattati secondo l’informativa privacy e potrò revocare il consenso in qualsiasi momento.';

export default function Funnel() {
  const { colors } = useTheme();
  const { data: funnels, isLoading } = useFunnels();
  const crea = useCreaFunnel();
  const attiva = useAttivaFunnel();

  const [apriNuovo, setApriNuovo] = useState(false);
  const [titolo, setTitolo] = useState('');
  const [sottotitolo, setSottotitolo] = useState('');
  const [slug, setSlug] = useState('');
  const [consenso, setConsenso] = useState(CONSENSO_PREDEFINITO);
  const [canali, setCanali] = useState<Canale[]>(['email']);
  const [aperto, setAperto] = useState<string | null>(null);

  const { data: lead } = useLead(aperto);

  // Lo slug si propone dal titolo, ma resta modificabile: è un indirizzo
  // pubblico, e chi lo pubblica deve poterlo scegliere.
  const slugEffettivo = slug.trim() || slugDaTitolo(titolo);

  const errore = useMemo(() => {
    if (titolo.trim().length < 3) return null;
    if (!slugValido(slugEffettivo)) return t.funnel.slugNonValido;
    if (consenso.trim().length < 20) return t.funnel.consensoCorto;
    if (canali.length === 0) return t.funnel.nessunCanale;
    return null;
  }, [titolo, slugEffettivo, consenso, canali]);

  const puoCreare = titolo.trim().length >= 3 && errore === null;

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText tone="muted" variant="caption">
        {t.funnel.sottotitolo}
      </ThemedText>

      {isLoading ? (
        <ThemedText tone="muted">{t.comune.caricamento}</ThemedText>
      ) : (funnels ?? []).length === 0 ? (
        <ThemedText tone="muted" variant="caption">
          {t.funnel.nessuno}
        </ThemedText>
      ) : (
        (funnels ?? []).map((f) => (
          <Card key={f.id} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ThemedText variant="heading" style={{ flex: 1 }}>
                {f.titolo}
              </ThemedText>
              <ThemedText tone={f.attivo ? 'success' : 'muted'} variant="caption">
                {f.attivo ? t.funnel.attivo : t.funnel.spento}
              </ThemedText>
            </View>
            {/* Il link da dare in giro. Senza la base configurata si mostra
                solo lo slug: un indirizzo inventato qualcuno lo copierebbe. */}
            <ThemedText tone={linkPubblico(BASE_FUNNEL, f.slug) ? 'accent' : 'muted'} variant="caption">
              {linkPubblico(BASE_FUNNEL, f.slug) ?? `/${f.slug}`}
            </ThemedText>
            {!BASE_FUNNEL && (
              <ThemedText tone="muted" variant="caption">
                {t.funnel.baseMancante}
              </ThemedText>
            )}
            <ThemedText tone="muted" variant="caption">
              {f.canali.map((c) => t.funnel.canaleNome[c] ?? c).join(' · ')}
            </ThemedText>
            <ThemedText tone="muted" variant="caption">
              {t.funnel.limite(f.maxLeadOra)}
            </ThemedText>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
              <Button
                title={aperto === f.id ? t.funnel.contatti : t.funnel.contatti}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setAperto(aperto === f.id ? null : f.id)}
              />
              <Button
                title={f.attivo ? t.funnel.spegni : t.funnel.accendi}
                variant="secondary"
                style={{ flex: 1 }}
                loading={attiva.isPending}
                onPress={() => attiva.mutate({ id: f.id, attivo: !f.attivo })}
              />
            </View>

            {aperto === f.id && (
              <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                {(lead ?? []).length === 0 ? (
                  <ThemedText tone="muted" variant="caption">
                    {t.funnel.nessunContatto}
                  </ThemedText>
                ) : (
                  (lead ?? []).map((l) => (
                    <View
                      key={l.id}
                      style={[styles.riga, { borderBottomColor: colors.border }]}
                    >
                      <ThemedText variant="caption" style={{ flex: 1 }}>
                        {l.nome ?? l.email ?? l.telefono ?? '—'}
                      </ThemedText>
                      <ThemedText tone="gold" variant="caption">
                        {l.canaliAccettati.map((c) => t.funnel.canaleNome[c] ?? c).join(' · ')}
                      </ThemedText>
                    </View>
                  ))
                )}
              </View>
            )}
          </Card>
        ))
      )}

      <ThemedText tone="muted" variant="caption">
        {t.funnel.spegniAiuto}
      </ThemedText>

      {/* Creazione */}
      {apriNuovo ? (
        <Card style={{ gap: spacing.md }}>
          <ThemedText variant="label" tone="muted">
            {t.funnel.nuovo}
          </ThemedText>

          <TextField label={t.funnel.campoTitolo} value={titolo} onChangeText={setTitolo} />
          <TextField
            label={t.funnel.campoSottotitolo}
            value={sottotitolo}
            onChangeText={setSottotitolo}
          />
          <View style={{ gap: spacing.xs }}>
            <TextField
              label={t.funnel.campoSlug}
              value={slugEffettivo}
              onChangeText={setSlug}
              autoCapitalize="none"
            />
            <ThemedText tone="muted" variant="caption">
              {t.funnel.slugAiuto}
            </ThemedText>
          </View>

          {/* Una spunta per canale: è il punto per cui esiste la 0018 */}
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="label" tone="muted">
              {t.funnel.canali}
            </ThemedText>
            <View style={styles.chips}>
              {CANALI.map((c) => (
                <Chip
                  key={c}
                  label={t.funnel.canaleNome[c] ?? c}
                  selezionato={canali.includes(c)}
                  onPress={() =>
                    setCanali((prev) =>
                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                    )
                  }
                />
              ))}
            </View>
            <ThemedText tone="muted" variant="caption">
              {t.funnel.canaliAiuto}
            </ThemedText>
          </View>

          <View style={{ gap: spacing.xs }}>
            <TextField
              label={t.funnel.campoConsenso}
              value={consenso}
              onChangeText={setConsenso}
              multiline
            />
            <ThemedText tone="muted" variant="caption">
              {t.funnel.consensoAiuto}
            </ThemedText>
          </View>

          {errore && (
            <ThemedText tone="error" variant="caption">
              {errore}
            </ThemedText>
          )}

          <Button
            title={t.funnel.crea}
            disabled={!puoCreare}
            loading={crea.isPending}
            onPress={() => {
              crea.mutate(
                {
                  slug: slugEffettivo,
                  titolo: titolo.trim(),
                  sottotitolo: sottotitolo.trim() || undefined,
                  canali,
                  testoConsenso: consenso.trim(),
                },
                {
                  onSuccess: () => {
                    setApriNuovo(false);
                    setTitolo('');
                    setSottotitolo('');
                    setSlug('');
                    setConsenso(CONSENSO_PREDEFINITO);
                    setCanali(['email']);
                  },
                },
              );
            }}
          />
          {crea.isError && (
            <ThemedText tone="error" variant="caption">
              {crea.error instanceof Error ? crea.error.message : t.comune.errore}
            </ThemedText>
          )}
        </Card>
      ) : (
        <Button title={t.funnel.nuovo} onPress={() => setApriNuovo(true)} />
      )}
    </Screen>
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
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selezionato }}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
