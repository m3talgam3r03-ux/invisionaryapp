import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, TextField, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { useImportClients } from '@/lib/clients';
import {
  buildClientRows,
  CLIENT_FIELDS,
  guessMapping,
  pickAndParseSpreadsheet,
  type ColumnMapping,
  type ParsedSheet,
} from '@/lib/importSpreadsheet';
import { radius, spacing, useTheme } from '@/theme';
import { BASI_GIURIDICHE, type BaseGiuridica } from '@/types/models';

export default function ImportClients() {
  const router = useRouter();
  const { colors } = useTheme();
  const importer = useImportClients();

  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // Dichiarazione obbligatoria: senza, l'importazione non parte.
  const [origineDati, setOrigineDati] = useState('');
  const [baseGiuridica, setBaseGiuridica] = useState<BaseGiuridica | null>(null);

  async function choose() {
    setPickError(null);
    setImportedCount(null);
    setPicking(true);
    try {
      const parsed = await pickAndParseSpreadsheet();
      if (parsed) {
        setSheet(parsed);
        setMapping(guessMapping(parsed.headers));
      }
    } catch (e) {
      setPickError(e instanceof Error ? e.message : 'Lettura del file non riuscita.');
    } finally {
      setPicking(false);
    }
  }

  function reset() {
    setSheet(null);
    setMapping(null);
    setImportedCount(null);
    setOrigineDati('');
    setBaseGiuridica(null);
    importer.reset();
  }

  const dichiarazioneCompleta = origineDati.trim().length > 0 && baseGiuridica !== null;

  // --- Risultato import ---------------------------------------------------
  if (importedCount !== null) {
    return (
      <Screen contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
        <ThemedText variant="title" tone="success">
          Import completato
        </ThemedText>
        <ThemedText tone="muted">
          {importedCount} clienti importati correttamente.
        </ThemedText>
        <Button title="Vai ai clienti" onPress={() => router.replace('/clients')} />
        <Button title="Importa un altro file" variant="secondary" onPress={reset} />
      </Screen>
    );
  }

  // --- Step 1: scelta file ------------------------------------------------
  if (!sheet || !mapping) {
    return (
      <Screen contentStyle={{ gap: spacing.lg }}>
        <ThemedText variant="heading">Importa clienti da file</ThemedText>
        <ThemedText tone="muted" variant="caption">
          Formati supportati: CSV e Excel (.xlsx). La prima riga deve contenere le intestazioni delle
          colonne.
        </ThemedText>
        <Button title="Scegli un file" onPress={choose} loading={picking} />
        {pickError && (
          <ThemedText tone="error" variant="caption">
            {pickError}
          </ThemedText>
        )}
      </Screen>
    );
  }

  // --- Step 2: mappatura + anteprima -------------------------------------
  const built = buildClientRows(sheet.rows, mapping);
  const canImport = mapping.nome !== null && built.length > 0;

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="heading">{sheet.fileName}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {sheet.rows.length} righe rilevate · {sheet.headers.length} colonne
        </ThemedText>
      </View>

      <View style={{ gap: spacing.md }}>
        <ThemedText variant="label" tone="muted">
          Abbina le colonne
        </ThemedText>
        {CLIENT_FIELDS.map((field) => (
          <View key={field.key} style={{ gap: spacing.sm }}>
            <ThemedText variant="caption">
              {field.label}
              {field.required ? ' *' : ''}
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip
                label="—"
                selected={mapping[field.key] === null}
                onPress={() => setMapping({ ...mapping, [field.key]: null })}
              />
              {sheet.headers.map((header, index) => (
                <Chip
                  key={index}
                  label={header}
                  selected={mapping[field.key] === index}
                  onPress={() => setMapping({ ...mapping, [field.key]: index })}
                />
              ))}
            </ScrollView>
          </View>
        ))}
      </View>

      {mapping.nome === null && (
        <ThemedText tone="error" variant="caption">
          Seleziona la colonna da usare come «Nome» (obbligatoria).
        </ThemedText>
      )}

      {/* Anteprima */}
      {built.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="label" tone="muted">
            Anteprima ({built.length} clienti validi)
          </ThemedText>
          {built.slice(0, 3).map((row, i) => (
            <Card key={i} style={{ gap: spacing.xs }}>
              <ThemedText variant="heading">{row.nome}</ThemedText>
              {row.prodotto ? (
                <ThemedText tone="muted" variant="caption">
                  {row.prodotto}
                </ThemedText>
              ) : null}
              {row.contatto ? (
                <ThemedText tone="muted" variant="caption">
                  {row.contatto}
                </ThemedText>
              ) : null}
            </Card>
          ))}
          {built.length > 3 && (
            <ThemedText tone="muted" variant="caption">
              …e altri {built.length - 3}.
            </ThemedText>
          )}
        </View>
      )}

      {/* Dichiarazione: non è burocrazia, è la sola risposta possibile a
          «perché avete questi dati». Senza, l'importazione non parte. */}
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.crm.importaSchermata.dichiarazione}
        </ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.crm.importaSchermata.dichiarazioneSpiega}
        </ThemedText>

        <TextField
          label={t.crm.importaSchermata.origineDati}
          value={origineDati}
          onChangeText={setOrigineDati}
          placeholder={t.crm.importaSchermata.origineDatiEsempio}
        />

        <ThemedText variant="label" tone="muted">
          {t.crm.importaSchermata.baseGiuridica}
        </ThemedText>
        <View style={styles.chips}>
          {BASI_GIURIDICHE.map((b) => (
            <Pressable
              key={b}
              onPress={() => setBaseGiuridica(b)}
              accessibilityRole="radio"
              accessibilityState={{ selected: baseGiuridica === b }}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: baseGiuridica === b ? colors.accent : colors.border,
                backgroundColor: baseGiuridica === b ? colors.accent : colors.surface,
              }}
            >
              <ThemedText
                variant="caption"
                style={{ color: baseGiuridica === b ? '#FFFFFF' : colors.text }}
              >
                {t.crm.importaSchermata.basi[b]}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {importer.isError && (
        <ThemedText tone="error" variant="caption">
          {importer.error instanceof Error ? importer.error.message : 'Import non riuscito.'}
        </ThemedText>
      )}

      <View style={{ gap: spacing.sm }}>
        {!dichiarazioneCompleta && built.length > 0 && (
          <ThemedText tone="muted" variant="caption">
            {t.crm.importaSchermata.mancaDichiarazione}
          </ThemedText>
        )}
        <Button
          title={t.crm.importaSchermata.importaN(built.length)}
          disabled={!canImport || !dichiarazioneCompleta}
          loading={importer.isPending}
          onPress={() =>
            importer.mutate(
              {
                rows: built,
                nomeFile: sheet?.fileName ?? null,
                origineDati,
                baseGiuridica: baseGiuridica as BaseGiuridica,
                righeTotali: sheet?.rows.length ?? built.length,
                righeDuplicate: 0,
              },
              { onSuccess: (count) => setImportedCount(count) },
            )
          }
        />
        <Button title="Scegli un altro file" variant="secondary" onPress={reset} />
      </View>
    </Screen>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accent : colors.surface,
      }}
    >
      <ThemedText variant="caption" style={{ color: selected ? '#FFFFFF' : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
});
