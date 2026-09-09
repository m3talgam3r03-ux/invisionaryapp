import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { ThemedText } from './ThemedText';

type Variant = 'primary' | 'secondary' | 'quiet';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Il pulsante del sistema.
 *
 * ── COSA È CAMBIATO ──
 * Prima l'etichetta era MAIUSCOLA con tracking largo, e il secondario era un
 * contorno vuoto. Apple fa entrambe le cose al contrario: **testo in frase
 * normale**, e il secondario è un riempimento tenue invece di un bordo. Un
 * bordo vuoto legge come «disattivato» a chi guarda in fretta; una superficie
 * grigia legge come «si può toccare, ma non è la cosa principale».
 *
 * Tre livelli, che è il numero giusto: quello che vuoi che si prema, quello
 * che si può premere, e quello che è solo una parola toccabile.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const sfondo =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surfaceAlt : 'transparent';
  const testo =
    variant === 'primary' ? '#FFFFFF' : variant === 'quiet' ? colors.accentText : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'quiet' && styles.quiet,
        {
          backgroundColor: sfondo,
          // Apple non fa sbiadire il pulsante premuto: lo rimpicciolisce
          // appena. La risposta è fisica, non un cambio di opacità.
          opacity: isDisabled ? 0.4 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={testo} />
      ) : (
        <ThemedText variant="label" style={{ color: testo, fontWeight: '600' }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quiet: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
});
