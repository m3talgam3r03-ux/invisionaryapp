import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import type { VocePodio } from '@/lib/podio';
import { ordinePodio } from '@/lib/podio';
import { radius, spacing, useTheme } from '@/theme';

/**
 * Il podio del mese: primo al centro e più alto, secondo a sinistra, terzo a
 * destra. È l'ordine con cui un podio si legge da sempre — metterli 1-2-3 da
 * sinistra farebbe sembrare il primo un terzo.
 *
 * Non mostra MAI importi né percentuali di guadagno: solo posizione, nome e
 * win rate. È un vincolo di prodotto, non una scelta grafica.
 */
export function Podio({ voci }: { voci: VocePodio[] }) {
  const { colors } = useTheme();
  const disposte = ordinePodio(voci);

  if (disposte.length === 0) {
    return (
      <ThemedText tone="muted" variant="caption">
        {t.podio.vuoto}
      </ThemedText>
    );
  }

  return (
    <View style={styles.base}>
      {disposte.map((v) => {
        const oro = v.posizione === 1;
        const colore = oro ? colors.gold : v.posizione === 2 ? colors.text : colors.textMuted;
        return (
          <View key={v.posizione} style={[styles.colonna, { paddingBottom: oro ? 0 : spacing.lg }]}>
            <ThemedText style={[styles.medaglia, { color: colore }]}>
              {t.podio.medaglia[v.posizione] ?? '•'}
            </ThemedText>
            <Avatar name={v.nome} size={oro ? 64 : 48} />
            <ThemedText variant="caption" numberOfLines={1} style={styles.nome}>
              {v.nome}
            </ThemedText>
            <ThemedText variant="caption" tone="muted">
              {t.podio.winRate(v.winRate)}
            </ThemedText>

            {/* Il gradino: l'altezza dice la posizione senza bisogno di leggere */}
            <View
              style={[
                styles.gradino,
                {
                  height: oro ? 84 : v.posizione === 2 ? 62 : 44,
                  backgroundColor: colors.surfaceAlt,
                  borderColor: oro ? colors.gold : colors.border,
                },
              ]}
            >
              <ThemedText style={[styles.numero, { color: colore }]}>{v.posizione}</ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  colonna: { flex: 1, alignItems: 'center', gap: spacing.xs },
  medaglia: { fontSize: 26, lineHeight: 30 },
  nome: { textAlign: 'center' },
  gradino: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { fontSize: 28, fontWeight: '800' },
});
