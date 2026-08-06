import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, EmptyState, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { classificaErrore, fusoDaSegnalare, raggruppaSlot, type Slot } from '@/lib/booking';
import {
  useAnnullaPrenotazione,
  useHostPrenotabili,
  usePrenota,
  usePrenotazioni,
  useSlotLiberi,
} from '@/lib/calendario';
import { can } from '@/lib/permissions';
import { radius, spacing, useTheme } from '@/theme';

export default function Calendario() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { data: host, isLoading: caricamentoHost } = useHostPrenotabili();
  const [hostId, setHostId] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ testo: string; errore: boolean } | null>(null);

  const scelto = useMemo(
    () => host?.find((h) => h.id === hostId) ?? host?.[0] ?? null,
    [host, hostId],
  );

  const { data: slot, isLoading: caricamentoSlot } = useSlotLiberi(scelto?.id);
  const { data: prenotazioni } = usePrenotazioni();
  const prenota = usePrenota();
  const annulla = useAnnullaPrenotazione();

  const giornate = useMemo(() => raggruppaSlot(slot ?? []), [slot]);
  const avvisaFuso = fusoDaSegnalare(scelto?.fuso);

  // «Adesso» non si legge durante il render: sarebbe un valore diverso a ogni
  // ridisegno. Sta in stato e avanza di minuto in minuto, così un appuntamento
  // che finisce sparisce dall'elenco da solo, senza ricaricare la schermata.
  const adesso = useAdesso();
  const attive = (prenotazioni ?? []).filter(
    (p) => p.stato === 'confermata' && new Date(p.fine).getTime() > adesso,
  );

  async function prenotaSlot(s: Slot) {
    if (!scelto) return;
    setMessaggio(null);
    try {
      await prenota.mutateAsync({ hostId: scelto.id, slot: s });
      setMessaggio({ testo: t.calendario.prenotato, errore: false });
    } catch (err) {
      // Non è un errore dell'utente: è una corsa persa contro qualcun altro.
      const tipo = classificaErrore(err);
      setMessaggio({
        testo:
          tipo === 'slot_occupato'
            ? t.calendario.slotOccupato
            : tipo === 'slot_non_disponibile'
              ? t.calendario.slotNonDisponibile
              : t.calendario.erroreGenerico,
        errore: true,
      });
    }
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {can(profile, 'calendar.host') && (
        <Button
          title={t.calendario.disponibilita}
          variant="secondary"
          onPress={() => router.push('/calendario/disponibilita')}
        />
      )}

      {/* I propri appuntamenti, prima di tutto */}
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.calendario.mieiAppuntamenti}
        </ThemedText>
        {attive.length === 0 ? (
          <ThemedText tone="muted" variant="caption">
            {t.calendario.nessunAppuntamento}
          </ThemedText>
        ) : (
          attive.map((p) => {
            const suo = p.guestId === profile?.id;
            const altro = (suo ? p.hostNome : p.guestNome) ?? '—';
            return (
              <Card key={p.id} style={{ gap: spacing.xs }}>
                <ThemedText tone="gold" variant="label">
                  {formattaQuando(p.inizio, p.fine)}
                </ThemedText>
                <ThemedText>{t.calendario.conNome(altro)}</ThemedText>
                {p.note ? (
                  <ThemedText tone="muted" variant="caption">
                    {p.note}
                  </ThemedText>
                ) : null}
                <Button
                  title={t.calendario.annulla}
                  variant="secondary"
                  loading={annulla.isPending}
                  onPress={() => annulla.mutate(p.id)}
                />
              </Card>
            );
          })
        )}
      </View>

      {/* Prenotare */}
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          {t.calendario.conChi}
        </ThemedText>
        {caricamentoHost ? (
          <ThemedText tone="muted" variant="caption">
            {t.comune.caricamento}
          </ThemedText>
        ) : host && host.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {host.map((h) => (
              <Chip
                key={h.id}
                label={h.nome}
                selezionato={scelto?.id === h.id}
                onPress={() => {
                  setHostId(h.id);
                  setMessaggio(null);
                }}
              />
            ))}
          </ScrollView>
        ) : (
          <EmptyState title={t.calendario.nessunHost} />
        )}
      </View>

      {avvisaFuso && scelto?.fuso && (
        <ThemedText tone="muted" variant="caption">
          {t.calendario.fusoDiverso(scelto.fuso)}
        </ThemedText>
      )}

      {messaggio && (
        <ThemedText tone={messaggio.errore ? 'error' : 'success'} variant="caption">
          {messaggio.testo}
        </ThemedText>
      )}

      {scelto && (
        <View style={{ gap: spacing.md }}>
          <ThemedText variant="label" tone="muted">
            {t.calendario.quando}
          </ThemedText>
          {caricamentoSlot ? (
            <ThemedText tone="muted" variant="caption">
              {t.calendario.caricamentoSlot}
            </ThemedText>
          ) : giornate.length === 0 ? (
            <ThemedText tone="muted" variant="caption">
              {t.calendario.nessunoSlot}
            </ThemedText>
          ) : (
            giornate.map((g) => (
              <View key={g.chiave} style={{ gap: spacing.sm }}>
                <ThemedText variant="caption" tone="muted">
                  {formattaGiorno(g.data)}
                </ThemedText>
                <View style={styles.griglia}>
                  {g.slot.map((s) => (
                    <Pressable
                      key={s.inizio}
                      onPress={() => void prenotaSlot(s)}
                      disabled={prenota.isPending}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.calendario.prenota} ${formattaOra(s.inizio)}`}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.md,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: prenota.isPending ? 0.5 : 1,
                      }}
                    >
                      <ThemedText variant="caption">{formattaOra(s.inizio)}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </Screen>
  );
}

/** L'istante corrente, aggiornato ogni minuto. */
function useAdesso(): number {
  const [adesso, setAdesso] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAdesso(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return adesso;
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
      accessibilityRole="radio"
      accessibilityState={{ selected: selezionato }}
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

/** Ora locale del dispositivo: è quella che chi guarda si aspetta di vedere. */
function formattaOra(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formattaGiorno(d: Date): string {
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formattaQuando(inizio: string, fine: string): string {
  const a = new Date(inizio);
  if (Number.isNaN(a.getTime())) return '—';
  return `${a.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${formattaOra(inizio)}–${formattaOra(fine)}`;
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: spacing.sm },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
