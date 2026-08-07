import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { COLONNE, RIGHE, type CasellaMappa } from '@/lib/mappa';
import { radius, spacing, useTheme } from '@/theme';

/**
 * L'Italia a caselle: ogni regione nella sua posizione geografica relativa.
 *
 * Perché non la sagoma vera: su un telefono Liguria, Molise e Valle d'Aosta
 * diventerebbero striscioline di pochi pixel — proprio quelle su cui il colore
 * non si leggerebbe. A caselle ogni regione ha lo stesso spazio, quindi
 * l'intensità si confronta davvero. La geometria sta in `mappa.ts` come dati:
 * per passare ai contorni reali si cambia quella, non questo componente.
 *
 * Toccando una casella si legge il nome per esteso: le sigle da tre lettere
 * stanno nello spazio ma non le conosce nessuno a memoria.
 */
export function MappaItalia({ caselle }: { caselle: CasellaMappa[] }) {
  const { colors } = useTheme();
  const [scelta, setScelta] = useState<CasellaMappa | null>(null);

  // Colonne + 1 perché sono indici 0-based.
  const larghezzaCella = 100 / (COLONNE + 1);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ aspectRatio: (COLONNE + 1) / RIGHE }}>
        {caselle.map((c) => (
          <Pressable
            key={c.nome}
            onPress={() => setScelta(scelta?.nome === c.nome ? null : c)}
            accessibilityRole="button"
            accessibilityLabel={`${c.nome}: ${etichetta(c)}`}
            style={{
              position: 'absolute',
              left: `${c.colonna * larghezzaCella}%`,
              top: `${(c.riga * 100) / RIGHE}%`,
              width: `${larghezzaCella}%`,
              height: `${100 / RIGHE}%`,
              padding: 2,
            }}
          >
            <View
              style={[
                styles.cella,
                {
                  backgroundColor: sfondo(c.livello, colors.gold, colors.surfaceAlt),
                  borderColor: scelta?.nome === c.nome ? colors.accent : colors.border,
                  borderWidth: scelta?.nome === c.nome ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <ThemedText
                style={[styles.sigla, { color: c.livello >= 3 ? '#0E0E10' : colors.text }]}
              >
                {c.sigla}
              </ThemedText>
              <ThemedText
                style={[styles.numero, { color: c.livello >= 3 ? '#0E0E10' : colors.textMuted }]}
              >
                {etichetta(c)}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Il nome per esteso della casella toccata */}
      <ThemedText variant="caption" tone={scelta ? 'default' : 'muted'} style={styles.centro}>
        {scelta ? `${scelta.nome} — ${dettaglio(scelta)}` : t.mappa.tocca}
      </ThemedText>

      <Legenda />
    </View>
  );
}

/** Cosa scrivere dentro la casella: `·` per il nascosto, `—` per il vuoto. */
function etichetta(c: CasellaMappa): string {
  if (c.nascosto) return '·';
  if (!c.iscritti) return '—';
  return String(c.iscritti);
}

function dettaglio(c: CasellaMappa): string {
  if (c.nascosto) return t.mappa.nascosto;
  if (!c.iscritti) return t.mappa.nessuno;
  return t.mappa.iscritti(c.iscritti);
}

/** L'oro sfuma con l'intensità: il livello 0 resta la superficie neutra. */
function sfondo(livello: number, oro: string, neutro: string): string {
  if (livello <= 0) return neutro;
  const opacita = [0, 0.22, 0.45, 0.7, 1][Math.min(livello, 4)];
  return mescola(oro, opacita);
}

/**
 * L'oro con trasparenza in notazione esadecimale.
 * `react-native-svg` e gli stili accettano `#RRGGBBAA`; comporlo qui evita di
 * dover portare in giro un colore diverso per ogni livello.
 */
function mescola(colore: string, opacita: number): string {
  const alfa = Math.round(Math.max(0, Math.min(1, opacita)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${colore}${alfa}`;
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
            {
              backgroundColor: sfondo(l, colors.gold, colors.surfaceAlt),
              borderColor: colors.border,
            },
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
  cella: {
    flex: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigla: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  numero: { fontSize: 11, fontWeight: '700' },
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
