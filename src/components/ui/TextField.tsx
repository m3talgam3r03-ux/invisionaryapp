import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, typography, useTheme } from '@/theme';

import { ThemedText } from './ThemedText';

type TextFieldProps = TextInputProps & {
  label?: string;
  errorText?: string;
};

/** Campo di testo tematizzato con etichetta e stato di errore. */
export function TextField({ label, errorText, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = errorText ? colors.error : focused ? colors.accent : colors.border;

  return (
    <View style={{ gap: spacing.sm }}>
      {label ? (
        <ThemedText variant="label" tone="muted">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
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
          { color: colors.text, backgroundColor: colors.surface, borderColor },
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
    height: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
});
