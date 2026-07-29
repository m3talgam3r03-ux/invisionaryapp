import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, TextField, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { authErrorMessage } from '@/lib/auth-errors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { BRAND, spacing } from '@/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri.');
      return;
    }
    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email.trim(), password, fullName.trim());
      if (needsConfirmation) {
        setInfo('Registrazione avvenuta. Controlla la mail per confermare, poi accedi.');
      }
      // Se la conferma email è disattivata, la sessione parte e la guardia reindirizza.
    } catch (e) {
      setError(authErrorMessage(e, isSupabaseConfigured));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll contentStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
        <ThemedText tone="gold" variant="label">
          {BRAND.payoff}
        </ThemedText>
        <ThemedText variant="title">Crea account</ThemedText>
        <ThemedText tone="muted" variant="caption">
          Il nuovo account parte come collaboratore. Il ruolo viene assegnato da un amministratore.
        </ThemedText>
      </View>

      {!isSupabaseConfigured && (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="heading">Database non collegato</ThemedText>
          <ThemedText tone="muted" variant="caption">
            Nel file <ThemedText variant="caption">.env</ThemedText> mancano l’indirizzo e la chiave
            del progetto Supabase: senza, non è possibile creare un account.
          </ThemedText>
        </Card>
      )}

      <TextField
        label="Nome e cognome"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        textContentType="name"
        placeholder="Mario Rossi"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="nome@esempio.com"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        placeholder="almeno 6 caratteri"
      />

      {error && (
        <ThemedText tone="error" variant="caption">
          {error}
        </ThemedText>
      )}
      {info && (
        <ThemedText tone="success" variant="caption">
          {info}
        </ThemedText>
      )}

      <Button title="Registrati" onPress={onSubmit} loading={loading} disabled={!isSupabaseConfigured} />

      <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
        <ThemedText tone="muted" variant="caption">
          Hai già un account?
        </ThemedText>
        <Link href="/sign-in">
          <ThemedText tone="accent" variant="caption">
            Accedi
          </ThemedText>
        </Link>
      </View>
    </Screen>
  );
}
