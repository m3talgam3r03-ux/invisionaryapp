import { Pressable, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Button } from './Button';
import { ThemedText } from './ThemedText';

type Props = {
  title: string;
  /** Cosa può fare l'utente adesso. Uno stato vuoto senza via d'uscita è un vicolo cieco. */
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Altre strade per uscire dal vuoto, sotto a quella principale.
   *
   * Servono qui e non altrove: chi ha la lista vuota e' esattamente la persona
   * che deve importare qualcosa, e tenere quelle vie in un angolo della
   * schermata — magari in due caratteri piccoli accanto al conteggio, come
   * facevamo — vuol dire nasconderle proprio a chi ne ha bisogno.
   */
  altreAzioni?: readonly { etichetta: string; onPress: () => void }[];
  tone?: 'neutral' | 'error';
  /**
   * Il segno sopra al titolo. Apple non lascia mai una schermata vuota al solo
   * testo: un simbolo grande e tenue dà un centro all'occhio e fa capire, prima
   * ancora di leggere, che lì non manca niente — semplicemente non c'è ancora
   * nulla. Senza, «Nessun cliente» sembra un errore.
   */
  glifo?: string;
  /**
   * Vuoto di SEZIONE, non di schermata: una riga sola dentro un riquadro, senza
   * il grande spazio verticale.
   *
   * La differenza conta. Un vuoto di schermata occupa il centro perché non c'è
   * altro; un vuoto di sezione sta in mezzo ad altre sezioni piene, e centrarlo
   * con lo stesso peso lo farebbe sembrare più importante di quelle. Il
   * riquadro serve a dire «la lista è questa, ed è vuota» invece di lasciare
   * una frase grigia che galleggia fra due blocchi.
   */
  compatto?: boolean;
};

/**
 * Stato vuoto o d'errore, uniforme in tutta l'app.
 * Prima ogni schermata se lo inventava: testi, spaziature e toni diversi a
 * parità di situazione.
 */
export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
  tone = 'neutral',
  glifo,
  compatto = false,
  altreAzioni,
}: Props) {
  const { colors } = useTheme();

  if (compatto) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          gap: spacing.xs,
          alignItems: 'center',
        }}
      >
        <ThemedText
          tone={tone === 'error' ? 'error' : 'muted'}
          variant="caption"
          style={{ textAlign: 'center' }}
        >
          {title}
        </ThemedText>
        {hint ? (
          <ThemedText tone="faint" variant="caption" style={{ textAlign: 'center' }}>
            {hint}
          </ThemedText>
        ) : null}
        {actionLabel && onAction ? (
          <Button
            title={actionLabel}
            variant="secondary"
            onPress={onAction}
            style={{ marginTop: spacing.sm }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm, paddingVertical: spacing.xl, alignItems: 'center' }}>
      {glifo ? (
        <ThemedText
          style={{
            fontSize: 40,
            lineHeight: 48,
            color: tone === 'error' ? colors.error : colors.textFaint,
          }}
        >
          {glifo}
        </ThemedText>
      ) : null}
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

      {altreAzioni?.length ? (
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs }}>
          {altreAzioni.map((a) => (
            <Pressable key={a.etichetta} onPress={a.onPress} accessibilityRole="button" hitSlop={10}>
              <ThemedText tone="accent" variant="label">
                {a.etichetta}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
