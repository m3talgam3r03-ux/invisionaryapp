import { View } from 'react-native';

import { spacing } from '@/theme';

import { Button } from './Button';
import { ThemedText } from './ThemedText';

type Props = {
  title: string;
  /** Cosa può fare l'utente adesso. Uno stato vuoto senza via d'uscita è un vicolo cieco. */
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
};

/**
 * Stato vuoto o d'errore, uniforme in tutta l'app.
 * Prima ogni schermata se lo inventava: testi, spaziature e toni diversi a
 * parità di situazione.
 */
export function EmptyState({ title, hint, actionLabel, onAction, tone = 'neutral' }: Props) {
  return (
    <View style={{ gap: spacing.sm, paddingVertical: spacing.xl, alignItems: 'center' }}>
      <ThemedText variant="heading" tone={tone === 'error' ? 'error' : undefined}>
        {title}
      </ThemedText>
      {hint && (
        <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center', maxWidth: 300 }}>
          {hint}
        </ThemedText>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.sm }} />
      )}
    </View>
  );
}
