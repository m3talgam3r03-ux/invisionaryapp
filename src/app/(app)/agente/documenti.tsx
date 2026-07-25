import { Redirect } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Screen, TextField, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useDocuments, useIngestDocument } from '@/lib/documents';
import { spacing } from '@/theme';

export default function Documenti() {
  const { profile, isProfileLoading } = useAuth();
  const { data: docs, isLoading, isError, error } = useDocuments();
  const ingest = useIngestDocument();

  const [source, setSource] = useState('');
  const [text, setText] = useState('');
  const [inserted, setInserted] = useState<number | null>(null);

  if (isProfileLoading && !profile) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }
  if (profile?.role !== 'admin') {
    return <Redirect href="/agente" />;
  }

  function submit() {
    setInserted(null);
    if (!text.trim()) return;
    ingest.mutate(
      { source: source.trim() || undefined, text: text.trim() },
      {
        onSuccess: (r) => {
          setInserted(r.inserted);
          setText('');
          setSource('');
        },
      },
    );
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText tone="muted" variant="caption">
        Aggiungi contenuti (guide, FAQ, materiali formativi). Il testo viene suddiviso in frammenti e
        indicizzato per l'agente AI.
      </ThemedText>

      <TextField
        label="Fonte / titolo"
        value={source}
        onChangeText={setSource}
        placeholder="es. Guida rete 2026"
      />
      <TextField
        label="Testo"
        value={text}
        onChangeText={setText}
        placeholder="Incolla qui il contenuto…"
        multiline
        numberOfLines={8}
        style={{ height: 180, textAlignVertical: 'top', paddingTop: spacing.md }}
      />
      <Button
        title="Aggiungi alla base di conoscenza"
        onPress={submit}
        loading={ingest.isPending}
      />
      {ingest.isError && (
        <ThemedText tone="error" variant="caption">
          {ingest.error instanceof Error ? ingest.error.message : 'Ingestione non riuscita.'}
        </ThemedText>
      )}
      {inserted !== null && (
        <ThemedText tone="success" variant="caption">
          Aggiunto: {inserted} frammenti indicizzati.
        </ThemedText>
      )}

      <ThemedText variant="label" tone="muted">
        Frammenti indicizzati ({docs?.length ?? 0})
      </ThemedText>
      {isLoading && <ThemedText tone="muted">Caricamento…</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {error instanceof Error ? error.message : 'Errore nel caricamento.'}
        </ThemedText>
      )}
      {docs?.length === 0 && (
        <ThemedText tone="muted" variant="caption">
          Ancora nessun documento nella base di conoscenza.
        </ThemedText>
      )}
      {docs?.map((d) => (
        <Card key={d.id} style={{ gap: spacing.xs }}>
          <ThemedText variant="heading">{d.source ?? 'Senza titolo'}</ThemedText>
          <ThemedText tone="muted" variant="caption" numberOfLines={2}>
            {d.content}
          </ThemedText>
        </Card>
      ))}
    </Screen>
  );
}
