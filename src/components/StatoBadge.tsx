import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ui';
import { t } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';
import type { ContactStato } from '@/types/models';

/**
 * Colore per fase. L'oro è riservato al traguardo — «cliente» — come vuole la
 * regola del marchio; il rosso segnala solo la perdita, non le fasi intermedie.
 */
function colorePerStato(stato: ContactStato, colors: ReturnType<typeof useTheme>['colors']) {
  switch (stato) {
    case 'cliente':
      return colors.gold;
    case 'perso':
      return colors.error;
    case 'appuntamento':
      return colors.text;
    default:
      return colors.textMuted;
  }
}

export function StatoBadge({ stato, compatto }: { stato: ContactStato; compatto?: boolean }) {
  const { colors } = useTheme();
  const colore = colorePerStato(stato, colors);

  return (
    <View style={[styles.badge, { borderColor: colore }, compatto && styles.compatto]}>
      <ThemedText variant="caption" style={{ color: colore, fontSize: compatto ? 10 : 11 }}>
        {t.crm.stato[stato]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  compatto: {
    paddingHorizontal: 6,
  },
});
