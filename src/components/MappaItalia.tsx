import { useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import {
  SCALA_MAX,
  SCALA_MIN,
  VISTA_INIZIALE,
  trascina,
  viewBoxDiVista,
  zooma,
  type RegioneDisegnata,
  type Vista,
} from '@/lib/mappa';
import { radius, spacing, useTheme } from '@/theme';

const ALTEZZA = 420;

/**
 * L'Italia coi contorni veri, colorata per numero di iscritti.
 *
 * Zoom e trascinamento si fanno spostando il `viewBox` dell'SVG invece di
 * applicare una trasformazione: così i contorni restano vettoriali a qualunque
 * ingrandimento — con `scale` la Sicilia a 6× sarebbe una macchia sfocata.
 *
 * Il trascinamento usa `PanResponder`, che è dentro React Native: per un
 * gesto solo non serviva tirare in ballo il gestore di gesti nativo.
 */
export function MappaItalia({ regioni }: { regioni: RegioneDisegnata[] }) {
  const { colors } = useTheme();
  const [vista, setVista] = useState<Vista>(VISTA_INIZIALE);
  const [scelta, setScelta] = useState<RegioneDisegnata | null>(null);

  /*
   * Il gesto si crea una volta sola: ricrearlo a ogni render lo perderebbe a
   * metà trascinamento.
   *
   * Gli spostamenti si applicano in modo INCREMENTALE — la differenza rispetto
   * all'ultimo evento — e la vista si aggiorna in forma funzionale. Così non
   * serve tenere da nessuna parte la vista di partenza: il gesto non ha bisogno
   * di sapere dove eravamo, solo di quanto ci si è mossi da un evento all'altro.
   */
  const [gesto] = useState(() => {
    let ultimoX = 0;
    let ultimoY = 0;
    let mosso = false;

    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Sotto i 4 px è un tocco, non un trascinamento: senza questa soglia
      // selezionare una regione diventerebbe quasi impossibile.
      onMoveShouldSetPanResponder: (_, g) => Math.hypot(g.dx, g.dy) > 4,
      onPanResponderGrant: () => {
        ultimoX = 0;
        ultimoY = 0;
        mosso = false;
      },
      onPanResponderMove: (_, g) => {
        mosso = true;
        const dx = g.dx - ultimoX;
        const dy = g.dy - ultimoY;
        ultimoX = g.dx;
        ultimoY = g.dy;
        setVista((v) => trascina(v, dx / 320, dy / ALTEZZA));
      },
    });

    return { responder, haTrascinato: () => mosso };
  });

  return (
    <View style={{ gap: spacing.md }}>
      <View
        {...gesto.responder.panHandlers}
        style={[styles.tela, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
      >
        <Svg width="100%" height={ALTEZZA} viewBox={viewBoxDiVista(vista)}>
          <G>
            {regioni.map((r) => (
              <Path
                key={r.id}
                d={r.contorno}
                fill={sfondo(r.livello, colors.gold, colors.surface)}
                stroke={scelta?.id === r.id ? colors.accent : colors.border}
                strokeWidth={scelta?.id === r.id ? 2.5 : 0.8}
                onPress={() => {
                  // Dopo un trascinamento il rilascio non è una selezione.
                  if (gesto.haTrascinato()) return;
                  setScelta(scelta?.id === r.id ? null : r);
                }}
              />
            ))}
          </G>
        </Svg>

        {/* Comandi dello zoom: il pizzico a due dita non c'è, e un solo modo
            per ingrandire è meglio di uno che funziona a metà. */}
        <View style={styles.comandi}>
          <Zoom segno="+" attivo={vista.scala < SCALA_MAX} onPress={() => setVista(zooma(vista, 1.6))} />
          <Zoom segno="−" attivo={vista.scala > SCALA_MIN} onPress={() => setVista(zooma(vista, 1 / 1.6))} />
        </View>
        {vista.scala > SCALA_MIN && (
          <Pressable
            style={[styles.reimposta, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setVista(VISTA_INIZIALE)}
            accessibilityRole="button"
          >
            <ThemedText variant="caption">{t.mappa.tuttaItalia}</ThemedText>
          </Pressable>
        )}
      </View>

      <ThemedText variant="caption" tone={scelta ? 'default' : 'muted'} style={styles.centro}>
        {scelta ? `${scelta.nome} — ${dettaglio(scelta)}` : t.mappa.tocca}
      </ThemedText>

      <Legenda />
    </View>
  );
}

function dettaglio(r: RegioneDisegnata): string {
  if (r.nascosto) return t.mappa.nascosto;
  if (!r.iscritti) return t.mappa.nessuno;
  return t.mappa.iscritti(r.iscritti);
}

/** L'oro sfuma con l'intensità: il livello 0 resta la superficie neutra. */
function sfondo(livello: number, oro: string, neutro: string): string {
  if (livello <= 0) return neutro;
  const opacita = [0, 0.25, 0.5, 0.75, 1][Math.min(livello, 4)];
  const alfa = Math.round(opacita * 255)
    .toString(16)
    .padStart(2, '0');
  return `${oro}${alfa}`;
}

function Zoom({
  segno,
  attivo,
  onPress,
}: {
  segno: string;
  attivo: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={attivo ? onPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={segno === '+' ? t.mappa.ingrandisci : t.mappa.rimpicciolisci}
      style={[
        styles.zoom,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: attivo ? 1 : 0.4,
        },
      ]}
    >
      <ThemedText style={styles.segno}>{segno}</ThemedText>
    </Pressable>
  );
}

function Legenda() {
  const { colors } = useTheme();
  return (
    <View style={styles.legenda}>
      <ThemedText variant="caption" tone="muted">
        {t.mappa.meno}
      </ThemedText>
      {[0, 1, 2, 3, 4].map((l) => (
        <View
          key={l}
          style={[
            styles.tacca,
            { backgroundColor: sfondo(l, colors.gold, colors.surface), borderColor: colors.border },
          ]}
        />
      ))}
      <ThemedText variant="caption" tone="muted">
        {t.mappa.piu}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  comandi: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    gap: spacing.xs,
  },
  zoom: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segno: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  reimposta: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  centro: { textAlign: 'center' },
  legenda: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tacca: {
    width: 22,
    height: 10,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
