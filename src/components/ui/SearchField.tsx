import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { radius, spacing, typography, useTheme } from '@/theme';

import { ThemedText } from './ThemedText';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
};

/** Campo di ricerca con pulsante per svuotare. */
export function SearchField({ value, onChangeText, placeholder = 'Cerca…' }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <ThemedText style={{ color: colors.textMuted }}>⌕</ThemedText>
      <TextInput
        style={[typography.body, styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Cancella la ricerca"
          hitSlop={10}
        >
          <ThemedText style={{ color: colors.textMuted }}>✕</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
});
