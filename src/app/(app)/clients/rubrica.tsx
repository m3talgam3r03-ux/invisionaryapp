import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Button, EmptyState, Screen, SearchField, ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { useClients, useImportClients } from '@/lib/clients';
import { leggiRubrica, type VoceRubrica } from '@/lib/device-contacts';
import { chiaveDeduplica } from '@/lib/normalize';
import { radius, spacing, useTheme } from '@/theme';

type Fase =
  | { tipo: 'iniziale' }
  | { tipo: 'lettura' }
  | { tipo: 'non_disponibile' }
  | { tipo: 'permesso_negato' }
  | { tipo: 'pronta'; voci: VoceRubrica[] };

/**
 * Importazione dalla rubrica del telefono.
 *
 * L'app legge in automatico, ma la SCELTA resta all'utente: nella rubrica ci
 * sono il medico e i familiari, e non devono finire in un CRM aziendale per
 * distrazione. I contatti aggiunti nascono senza consensi, quindi non
 * contattabili: avere un numero non significa essere autorizzati a usarlo.
 */
export default function Rubrica() {
  const router = useRouter();
  const { colors } = useTheme();
  const importer = useImportClients();
  const { data: giaInCrm } = useClients();

  const [fase, setFase] = useState<Fase>({ tipo: 'iniziale' });
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [aggiunti, setAggiunti] = useState<number | null>(null);

  // Chi è già in lista, nella stessa forma normalizzata usata dalla deduplica.
  const chiaviEsistenti = useMemo(() => {
    const set = new Set<string>();
    for (const c of giaInCrm ?? []) {
      const k = chiaveDeduplica({ email: c.email, telefono: c.telefono_e164 });
      if (k) set.add(k);
    }
    return set;
  }, [giaInCrm]);

  // Memorizzata invece di ricavata al volo: un array nuovo a ogni render
  // rifarebbe tutti i calcoli che dipendono da lui.
  const voci = useMemo(() => (fase.tipo === 'pronta' ? fase.voci : []), [fase]);

  const visibili = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return voci;
    return voci.filter((v) => v.nome.toLowerCase().includes(q));
  }, [voci, query]);

  const esisteGia = useCallback(
    (v: VoceRubrica): boolean => {
      const k = chiaveDeduplica({ email: v.email, telefono: v.telefono });
      return k !== null && chiaviEsistenti.has(k);
    },
    [chiaviEsistenti],
  );

  /** Selezionabili = tutti tranne chi è già nel CRM. */
  const selezionabili = useMemo(() => visibili.filter((v) => !esisteGia(v)), [visibili, esisteGia]);

  async function apri() {
    setFase({ tipo: 'lettura' });
    const esito = await leggiRubrica();
    if (esito.stato === 'ok') setFase({ tipo: 'pronta', voci: esito.voci });
    else if (esito.stato === 'permesso_negato') setFase({ tipo: 'permesso_negato' });
    else setFase({ tipo: 'non_disponibile' });
  }

  function alterna(id: string) {
    setScelti((prec) => {
      const next = new Set(prec);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function importa() {
    const daImportare = voci.filter((v) => scelti.has(v.id) && !esisteGia(v));
    importer.mutate(
      {
        rows: daImportare.map((v) => ({
          nome: v.nome,
          contatto: v.email ?? v.telefono,
          email: v.email,
          telefono_e164: v.telefono,
          origine: 'rubrica',
        })),
        nomeFile: null,
        origineDati: t.crm.rubrica.origineDati,
        // La rubrica personale è il caso tipico del legittimo interesse: sono
        // persone con cui esiste già un rapporto. Resta comunque dichiarato.
        baseGiuridica: 'legittimo_interesse',
        righeTotali: voci.length,
        righeDuplicate: voci.filter(esisteGia).length,
      },
      { onSuccess: (n) => setAggiunti(n) },
    );
  }

  // --- Esito ---------------------------------------------------------------
  if (aggiunti !== null) {
    return (
      <Screen contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
        <ThemedText variant="title" tone="success">
          {t.crm.rubrica.fatto(aggiunti)}
        </ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.crm.consensi.sottotitolo}
        </ThemedText>
        <Button title="Torna ai contatti" onPress={() => router.back()} />
      </Screen>
    );
  }

  // --- Prima della lettura --------------------------------------------------
  if (fase.tipo !== 'pronta') {
    return (
      <Screen contentStyle={{ gap: spacing.lg }}>
        <ThemedText variant="title">{t.crm.rubrica.titolo}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.crm.rubrica.spiega}
        </ThemedText>
        <ThemedText tone="muted" variant="caption">
          {t.crm.rubrica.avvisoPrivacy}
        </ThemedText>

        {fase.tipo === 'non_disponibile' && (
          <EmptyState
            title={t.crm.rubrica.nonDisponibile}
            hint={t.crm.rubrica.nonDisponibileSpiega}
          />
        )}
        {fase.tipo === 'permesso_negato' && (
          <EmptyState
            tone="error"
            title={t.crm.rubrica.permessoNegato}
            hint={t.crm.rubrica.permessoNegatoSpiega}
          />
        )}

        <Button
          title={t.crm.rubrica.leggi}
          loading={fase.tipo === 'lettura'}
          onPress={() => void apri()}
        />
      </Screen>
    );
  }

  // --- Selezione ------------------------------------------------------------
  if (voci.length === 0) {
    return (
      <Screen contentStyle={{ gap: spacing.lg }}>
        <EmptyState title={t.crm.rubrica.vuota} hint={t.crm.rubrica.vuotaSpiega} />
      </Screen>
    );
  }

  const nSelezionati = scelti.size;
  const tuttiSelezionati = selezionabili.length > 0 && selezionabili.every((v) => scelti.has(v.id));

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <SearchField value={query} onChangeText={setQuery} placeholder={t.crm.rubrica.cerca} />
        <View style={styles.metaRow}>
          <ThemedText tone="muted" variant="caption">
            {t.crm.rubrica.trovati(voci.length)} · {t.crm.rubrica.selezionati(nSelezionati)}
          </ThemedText>
          <Pressable
            onPress={() =>
              setScelti(tuttiSelezionati ? new Set() : new Set(selezionabili.map((v) => v.id)))
            }
            accessibilityRole="button"
            hitSlop={8}
          >
            <ThemedText tone="accent" variant="caption">
              {tuttiSelezionati ? t.crm.rubrica.deselezionaTutti : t.crm.rubrica.selezionaTutti}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={visibili}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <Riga
            voce={item}
            gia={esisteGia(item)}
            scelto={scelti.has(item.id)}
            onPress={() => alterna(item.id)}
          />
        )}
      />

      <View style={styles.footer}>
        {importer.isError && (
          <ThemedText tone="error" variant="caption">
            {importer.error instanceof Error ? importer.error.message : t.comune.errore}
          </ThemedText>
        )}
        <Button
          title={t.crm.rubrica.aggiungi(nSelezionati)}
          disabled={nSelezionati === 0}
          loading={importer.isPending}
          onPress={importa}
        />
      </View>
    </SafeAreaView>
  );
}

function Riga({
  voce,
  gia,
  scelto,
  onPress,
}: {
  voce: VoceRubrica;
  gia: boolean;
  scelto: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const sotto = voce.email ?? voce.telefono ?? '';

  return (
    <Pressable
      onPress={gia ? undefined : onPress}
      disabled={gia}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: scelto, disabled: gia }}
      style={({ pressed }) => ({ opacity: gia ? 0.45 : pressed ? 0.85 : 1 })}
    >
      <View style={[styles.riga, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Avatar name={voce.nome} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="heading" numberOfLines={1}>
            {voce.nome}
          </ThemedText>
          <ThemedText tone="muted" variant="caption" numberOfLines={1}>
            {gia ? t.crm.rubrica.giaInLista : sotto}
          </ThemedText>
        </View>

        {!gia && (
          <View
            style={[
              styles.spunta,
              {
                borderColor: scelto ? colors.accent : colors.border,
                backgroundColor: scelto ? colors.accent : 'transparent',
              },
            ]}
          >
            {scelto && <ThemedText style={{ color: '#FFFFFF', fontSize: 14 }}>✓</ThemedText>}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  spunta: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
