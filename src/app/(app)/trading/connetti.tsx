import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Screen, TextField, ThemedText } from '@/components/ui';
import { useConnectAccount } from '@/lib/trading';
import { radius, spacing, useTheme } from '@/theme';

export default function ConnettiMt5() {
  const router = useRouter();
  const { colors } = useTheme();
  const connect = useConnectAccount();

  const [login, setLogin] = useState('');
  const [server, setServer] = useState('');
  const [password, setPassword] = useState('');
  const [platform, setPlatform] = useState<'mt5' | 'mt4'>('mt5');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!login.trim() || !server.trim() || !password) {
      setError('Compila login, server e investor password.');
      return;
    }
    setError(null);
    connect.mutate(
      { login: login.trim(), server: server.trim(), password, platform },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText tone="muted" variant="caption">
        Collega il tuo conto in <ThemedText tone="default" variant="caption">sola lettura</ThemedText>{' '}
        usando la <ThemedText tone="gold" variant="caption">investor password</ThemedText> (mai la
        password master). La password viene inoltrata a MetaApi e non è salvata nell'app.
      </ThemedText>

      <TextField label="Login (numero conto)" value={login} onChangeText={setLogin} keyboardType="number-pad" placeholder="es. 5012345" />
      <TextField label="Server" value={server} onChangeText={setServer} autoCapitalize="none" placeholder="es. BrokerName-Live" />
      <TextField label="Investor password" value={password} onChangeText={setPassword} secureTextEntry placeholder="password di sola lettura" />

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" tone="muted">
          Piattaforma
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['mt5', 'mt4'] as const).map((p) => {
            const selected = platform === p;
            return (
              <Pressable
                accessibilityRole="button"
                key={p}
                onPress={() => setPlatform(p)}
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accent : colors.surface,
                }}
              >
                <ThemedText variant="caption" style={{ color: selected ? '#FFFFFF' : colors.text }}>
                  {p.toUpperCase()}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error && (
        <ThemedText tone="error" variant="caption">
          {error}
        </ThemedText>
      )}
      {connect.isError && (
        <ThemedText tone="error" variant="caption">
          {connect.error instanceof Error ? connect.error.message : 'Collegamento non riuscito.'}
        </ThemedText>
      )}

      <Button title="Collega account" onPress={submit} loading={connect.isPending} />

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        Dopo il collegamento l'account impiega qualche istante a connettersi: poi usa «Sincronizza».
      </ThemedText>
    </Screen>
  );
}
