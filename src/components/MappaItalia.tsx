import { useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import {
  MARI,
  SCALA_MAX,
  SCALA_MIN,
  VIEW_BOX,
  VISTA_INIZIALE,
  trascina,
  viewBoxDiVista,
  zooma,
  type RegioneDisegnata,
  type Vista,
} from '@/lib/mappa';
import { radius, spacing, useTheme } from '@/theme';

const ALTEZZA = 460;
const [, , LARGHEZZA_MAPPA, ALTEZZA_MAPPA] = VIEW_BOX.split(/\s+/).map(Number);

/** Il mare. Blu profondo verso il basso, come una carta nautica. */
const MARE_ALTO = '#0E2F42';
const MARE_BASSO = '#0A2231';
const COSTA = '#1D5570';

/**
 * L'Italia coi contorni veri, in mezzo al mare, colorata per numero di iscritti.
 *
 * Zoom e trascinamento spostano il `viewBox` invece di applicare una
 * trasformazione: così i contorni restano vettoriali a qualunque ingrandimento
 * — con `scale`, a 6× la Sicilia sarebbe una macchia sfocata.
 *
 * I nomi delle regioni compaiono solo da ingranditi, come su qualunque mappa:
 * a tutta Italia venti etichette si sovrapporrebbero e non se ne leggerebbe
 * nessuna. Il numero degli iscritti invece c'è sempre — è il motivo per cui
 * questa schermata esiste.
 */
export function MappaItalia({ regioni }: { regioni: RegioneDisegnata[] }) {
  const { colors } = useTheme();
  const [vista, setVista] = useState<Vista>(VISTA_INIZIALE);
  const [scelta, setScelta] = useState<RegioneDisegnata | null>(null);

  /*
   * Il gesto si crea una volta sola: ricrearlo a ogni render lo perderebbe a
   * metà trascinamento. Gli spostamenti sono INCREMENTALI e lo stato si
   * aggiorna in forma funzionale, così il gesto non deve ricordare da dove si
   * era partiti.
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

  // Le etichette col nome hanno senso solo quando c'è spazio per leggerle.
  const conNomi = vista.scala >= 2;
  const tratto = 0.8 / vista.scala; // i bordi non ingrassano quando si zooma

  return (
    <View style={{ gap: spacing.md }}>
      <View {...gesto.responder.panHandlers} style={[styles.tela, { borderColor: COSTA }]}>
        <Svg width="100%" height={ALTEZZA} viewBox={viewBoxDiVista(vista)}>
          <Defs>
            <LinearGradient id="mare" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor={MARE_ALTO} />
              <Stop offset="1" stopColor={MARE_BASSO} />
            </LinearGradient>
            <LinearGradient id="terra" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.gold} stopOpacity="1" />
              <Stop offset="1" stopColor="#A8841B" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Il mare, con i paralleli appena accennati: bastano a far leggere
              il riquadro come una carta invece che come uno sfondo colorato. */}
          <Rect x="0" y="0" width={LARGHEZZA_MAPPA} height={ALTEZZA_MAPPA} fill="url(#mare)" />
          {Array.from({ length: 9 }, (_, i) => (i + 1) * (ALTEZZA_MAPPA / 10)).map((y) => (
            <Line
              key={`p${y}`}
              x1="0"
              y1={y}
              x2={LARGHEZZA_MAPPA}
              y2={y}
              stroke={COSTA}
              strokeWidth={0.4 / vista.scala}
              opacity={0.35}
            />
          ))}
          {Array.from({ length: 6 }, (_, i) => (i + 1) * (LARGHEZZA_MAPPA / 7)).map((x) => (
            <Line
              key={`m${x}`}
              x1={x}
              y1="0"
              x2={x}
              y2={ALTEZZA_MAPPA}
              stroke={COSTA}
              strokeWidth={0.4 / vista.scala}
              opacity={0.35}
            />
          ))}

          {/* I nomi dei mari, sotto la terra così non ne coprono mai un pezzo */}
          {MARI.map((m) => (
            <SvgText
              key={m.nome}
              x={m.x}
              y={m.y}
              fontSize={m.dimensione / Math.sqrt(vista.scala)}
              fontWeight="600"
              fill="#5E9FBF"
              opacity={0.55}
              letterSpacing={m.dimensione * 0.12}
              textAnchor="middle"
            >
              {m.nome}
            </SvgText>
          ))}

          {/* L'ombra della terra sul mare: una copia scura spostata di poco.
              Un vero filtro di sfocatura su react-native-svg non è affidabile
              su tutte le piattaforme, e questa dà la stessa profondità. */}
          <G opacity={0.45}>
            {regioni.map((r) => (
              <Path key={`ombra-${r.id}`} d={r.contorno} fill="#05141D" translateX={2} translateY={3} />
            ))}
          </G>

          {/* La terra */}
          {regioni.map((r) => (
            <Path
              key={r.id}
              d={r.contorno}
              fill={sfondo(r.livello, colors.gold)}
              stroke={scelta?.id === r.id ? colors.accent : '#F5F3EF'}
              strokeWidth={scelta?.id === r.id ? 2.4 / vista.scala : tratto}
              strokeOpacity={scelta?.id === r.id ? 1 : 0.55}
              onPress={() => {
                // Dopo un trascinamento il rilascio non è una selezione.
                if (gesto.haTrascinato()) return;
                setScelta(scelta?.id === r.id ? null : r);
              }}
            />
          ))}

          {/* I numeri: una pastiglia per non perderli sul colore sotto */}
          {regioni.map((r) => {
            const testo = etichettaNumero(r);
            if (!testo) return null;
            const raggio = 15 / Math.sqrt(vista.scala);
            return (
              <G key={`n-${r.id}`}>
                <Circle
                  cx={r.centro.x}
                  cy={r.centro.y}
                  r={raggio}
                  fill="#0E0E10"
                  fillOpacity={0.72}
                  stroke={colors.gold}
                  strokeWidth={0.8 / vista.scala}
                />
                <SvgText
                  x={r.centro.x}
                  y={r.centro.y + raggio * 0.34}
                  fontSize={raggio * 1.05}
                  fontWeight="800"
                  fill={r.nascosto ? colors.textMuted : colors.gold}
                  textAnchor="middle"
                >
                  {testo}
                </SvgText>
                {conNomi && (
                  <SvgText
                    x={r.centro.x}
                    y={r.centro.y + raggio * 2.1}
                    fontSize={11 / Math.sqrt(vista.scala)}
                    fontWeight="700"
                    fill="#F5F3EF"
                    textAnchor="middle"
                  >
                    {r.nome}
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>

        {/* Comandi dello zoom: il pizzico a due dita non c'è, e un solo modo
            per ingrandire è meglio di uno che funziona a metà. */}
        <View style={styles.comandi}>
          <Zoom
            segno="+"
            attivo={vista.scala < SCALA_MAX}
            onPress={() => setVista(zooma(vista, 1.6))}
          />
          <Zoom
            segno="−"
            attivo={vista.scala > SCALA_MIN}
            onPress={() => setVista(zooma(vista, 1 / 1.6))}
          />
        </View>

        {/* La rosa dei venti: non serve a niente, e fa sembrare una mappa una
            mappa. Sparisce da ingranditi, dove ruberebbe spazio. */}
        {vista.scala === SCALA_MIN && (
          <View style={styles.bussola} pointerEvents="none">
            <ThemedText style={styles.nord}>N</ThemedText>
            <ThemedText style={styles.ago}>▲</ThemedText>
          </View>
        )}

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

      {/* Il dettaglio della regione toccata, in una scheda invece che in una riga */}
      {scelta ? (
        <View style={[styles.scheda, { backgroundColor: colors.surfaceAlt, borderColor: colors.gold }]}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading">{scelta.nome}</ThemedText>
            <ThemedText tone="muted" variant="caption">
              {dettaglio(scelta)}
            </ThemedText>
          </View>
          {!scelta.nascosto && scelta.iscritti ? (
            <ThemedText tone="gold" style={styles.grande}>
              {scelta.iscritti}
            </ThemedText>
          ) : null}
        </View>
      ) : (
        <ThemedText variant="caption" tone="muted" style={styles.centro}>
          {t.mappa.tocca}
        </ThemedText>
      )}

      <Legenda />
    </View>
  );
}

/** Cosa scrivere nella pastiglia. `null` = niente pastiglia. */
function etichettaNumero(r: RegioneDisegnata): string | null {
  if (r.nascosto) return '·';
  if (!r.iscritti) return null;
  return String(r.iscritti);
}

function dettaglio(r: RegioneDisegnata): string {
  if (r.nascosto) return t.mappa.nascosto;
  if (!r.iscritti) return t.mappa.nessuno;
  return t.mappa.iscritti(r.iscritti);
}

/** Dal verde-mare del vuoto all'oro pieno. */
function sfondo(livello: number, oro: string): string {
  if (livello <= 0) return '#2E4A52';
  const opacita = [0, 0.3, 0.52, 0.76, 1][Math.min(livello, 4)];
  const alfa = Math.round(opacita * 255)
    .toString(16)
    .padStart(2, '0');
  return `${oro}${alfa}`;
}

function Zoom({ segno, attivo, onPress }: { segno: string; attivo: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={attivo ? onPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={segno === '+' ? t.mappa.ingrandisci : t.mappa.rimpicciolisci}
      style={[
        styles.zoom,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: attivo ? 1 : 0.4 },
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
          style={[styles.tacca, { backgroundColor: sfondo(l, colors.gold), borderColor: COSTA }]}
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
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: MARE_BASSO,
  },
  comandi: { position: 'absolute', right: spacing.sm, top: spacing.sm, gap: spacing.xs },
  zoom: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segno: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  bussola: { position: 'absolute', left: spacing.md, top: spacing.md, alignItems: 'center' },
  nord: { color: '#F5F3EF', fontSize: 11, fontWeight: '800', opacity: 0.7 },
  ago: { color: '#C9A227', fontSize: 13, lineHeight: 15, opacity: 0.85 },
  reimposta: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scheda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  grande: { fontSize: 30, fontWeight: '800', lineHeight: 34 },
  centro: { textAlign: 'center' },
  legenda: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tacca: { width: 22, height: 10, borderRadius: 2, borderWidth: StyleSheet.hairlineWidth },
});
