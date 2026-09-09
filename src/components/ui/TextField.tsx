import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, typography, useTheme } from '@/theme';

import { ThemedText } from './ThemedText';

type TextFieldProps = TextInputProps & {
  label?: string;
  errorText?: string;
};

/**
 * Campo di testo.
 *
 * ── COSA È CAMBIATO ──
 * Prima: sfondo uguale alla scheda, bordo sottile sempre presente, e
 * un'etichetta MAIUSCOLA sopra.
 *
 * Adesso: nessun bordo a riposo, e il campo si distingue perché sta un
 * gradino DENTRO la superficie che lo contiene — come in iOS. Il bordo
 * compare solo quando il campo ha il fuoco, e lì serve: dice dove stai
 * scrivendo. Un bordo che c'è sempre non distingue niente.
 */
export function TextField({ label, errorText, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const bordo = errorText ? colors.error : focused ? colors.accent : 'transparent';

  return (
    <View style={{ gap: spacing.sm }}>
      {label ? (
        <ThemedText variant="caption" tone="muted">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          typography.body,
          styles.input,
          { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: bordo },
          style,
        ]}
        {...rest}
      />
      {errorText ? (
        <ThemedText variant="caption" tone="error">
          {errorText}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    // Il bordo c'è sempre come SPESSORE (altrimenti il campo salterebbe di
    // due pixel quando prende il fuoco) ma è trasparente finché non serve.
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
