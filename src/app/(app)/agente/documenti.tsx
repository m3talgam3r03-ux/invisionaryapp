import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, TextField, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import {
  CORPUS,
  useDeleteDocument,
  useDocuments,
  useIngestDocument,
  useSeedCorpus,
  type SeedProgress,
} from '@/lib/documents';
import { DOMAIN_IDS, domainLabel, type DomainId } from '@/lib/domains';
import { can } from '@/lib/permissions';
import { messaggioErrore } from '@/lib/errori';
import { radius, spacing, useTheme } from '@/theme';
import { t } from '@/i18n/it';

export default function Documenti() {
  const { colors } = useTheme();
  const { profile, isProfileLoading } = useAuth();
  const { data: docs, isLoading, isError, error } = useDocuments();
  const ingest = useIngestDocument();
  const remove = useDeleteDocument();

  const [progress, setProgress] = useState<SeedProgress | null>(null);
  const seed = useSeedCorpus(setProgress);

  const [source, setSource] = useState('');
  const [text, setText] = useState('');
  const [domain, setDomain] = useState<DomainId | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }
  if (!can(profile, 'knowledge.manage')) {
    return <Redirect href="/agente" />;
  }

  function submit() {
    setResult(null);
    if (!text.trim()) return;
    ingest.mutate(
      {
        source: source.trim() || undefined,
        text: text.trim(),
        domain: domain ?? undefined,
        markdown: true,
        replace: true,
      },
      {
        onSuccess: (r) => {
          setResult(
            `Indicizzato: ${r.inserted} frammenti` +
              (r.deleted ? ` (sostituiti ${r.deleted} precedenti).` : '.'),
          );
          setText('');
          setSource('');
          setDomain(null);
        },
      },
    );
  }

  function confirmDelete(docSource: string) {
    Alert.alert(
      'Rimuovere il documento?',
      `«${docSource}» verrà tolto dalla base di conoscenza dell'agente.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Rimuovi', style: 'destructive', onPress: () => remove.mutate(docSource) },
      ],
    );
  }

  const seeding = seed.isPending;

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {/* — Corpus incluso nell'app — */}
      <Card style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">{t.baseConoscenza.competenzaDiBase}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {CORPUS.length} documenti su vendita, marketing, network marketing, investimenti,
          trading, mindset e compliance sono inclusi nell&apos;app. Caricali per dare all&apos;agente
          la sua competenza; rilanciare l&apos;operazione aggiorna senza duplicare.
        </ThemedText>
        <Button
          title={seeding ? 'Caricamento…' : `Carica i ${CORPUS.length} documenti`}
          onPress={() => {
            setResult(null);
            seed.mutate();
          }}
          loading={seeding}
        />
        {seeding && progress && (
          <ThemedText tone="muted" variant="caption">
            {progress.done}/{progress.total} · {progress.current}
          </ThemedText>
        )}
        {seed.isError && (
          <ThemedText tone="error" variant="caption">
            {messaggioErrore(seed.error, t.baseConoscenza.caricamentoFallito)}
          </ThemedText>
        )}
        {seed.isSuccess && !seeding && (
          <ThemedText tone="success" variant="caption">
            Caricati {seed.data.documents} documenti, {seed.data.chunks} frammenti indicizzati.
          </ThemedText>
        )}
      </Card>

      {/* — Aggiunta manuale — */}
      <ThemedText variant="heading">{t.baseConoscenza.aggiungiContenuto}</ThemedText>
      <ThemedText tone="muted" variant="caption">
        Guide, FAQ, materiali formativi. Il testo viene diviso in frammenti e indicizzato. Scegliere
        il dominio è importante: è ciò che dà priorità al documento quando la domanda riguarda
        quell&apos;area.
      </ThemedText>

      <TextField
        label={t.baseConoscenza.fonte}
        value={source}
        onChangeText={setSource}
        placeholder={t.baseConoscenza.fonteEsempio}
      />

      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="label" tone="muted">
          Dominio
        </ThemedText>
        <View style={styles.chips}>
          {DOMAIN_IDS.map((id) => {
            const active = domain === id;
            return (
              <Pressable
                key={id}
                onPress={() => setDomain(active ? null : id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.accent : colors.surfaceAlt,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  style={{ color: active ? '#FFFFFF' : colors.textMuted }}
                >
                  {domainLabel(id)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        label={t.baseConoscenza.testo}
        value={text}
        onChangeText={setText}
        placeholder={t.baseConoscenza.testoEsempio}
        multiline
        numberOfLines={8}
        style={{ height: 180, textAlignVertical: 'top', paddingTop: spacing.md }}
      />
      <Button
        title={t.baseConoscenza.aggiungi}
        onPress={submit}
        loading={ingest.isPending}
        disabled={seeding}
      />
      {ingest.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(ingest.error, t.baseConoscenza.ingestioneFallita)}
        </ThemedText>
      )}
      {result && (
        <ThemedText tone="success" variant="caption">
          {result}
        </ThemedText>
      )}

      {/* — Cosa c'è dentro il cervello — */}
      <ThemedText variant="label" tone="muted">
        Nella base di conoscenza ({docs?.length ?? 0} documenti)
      </ThemedText>
      {isLoading && <ThemedText tone="muted">Caricamento…</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(error, t.comune.errore)}
        </ThemedText>
      )}
      {docs?.length === 0 && (
        <ThemedText tone="muted" variant="caption">
          Ancora vuota: l&apos;agente risponderà solo con la sua competenza generale, senza
          appoggiarsi ai materiali della piattaforma.
        </ThemedText>
      )}
      {/* Un documento non rimosso resta nelle risposte dell'agente: se lo si
          toglieva perché sbagliato o superato, continuerebbe a citarlo. */}
      {remove.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(remove.error, t.baseConoscenza.rimozioneFallita)}
        </ThemedText>
      )}
      {docs?.map((d) => (
        <Card key={d.source} style={{ gap: spacing.xs }}>
          <ThemedText variant="heading">{d.source}</ThemedText>
          <ThemedText tone="muted" variant="caption">
            {domainLabel(d.domain)} · {d.chunks} frammenti
          </ThemedText>
          <Pressable
            onPress={() => confirmDelete(d.source)}
            accessibilityRole="button"
            accessibilityLabel={`Rimuovi ${d.source}`}
            hitSlop={8}
            style={{ alignSelf: 'flex-start' }}
          >
            <ThemedText tone="error" variant="caption">
              Rimuovi
            </ThemedText>
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
