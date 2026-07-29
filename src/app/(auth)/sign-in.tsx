import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Crest } from '@/components/Crest';
import { Button, Card, Screen, TextField, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { authErrorMessage } from '@/lib/auth-errors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { BRAND, spacing } from '@/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Al successo, la guardia in _layout reindirizza alla home protetta.
    } catch (e) {
      setError(authErrorMessage(e, isSupabaseConfigured));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll contentStyle={{ justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <Crest size={108} variant="full" />
        <ThemedText tone="gold" variant="label">
          {BRAND.payoff}
        </ThemedText>
        <ThemedText variant="title" style={{ textAlign: 'center' }}>
          Accedi a {BRAND.name}
        </ThemedText>
      </View>

      {/* Senza database l'accesso non può riuscire: meglio dirlo prima del
          tentativo, invece di lasciare che fallisca con un errore tecnico. */}
      {!isSupabaseConfigured && (
        <Card style={{ gap: spacing.xs }}>
          <ThemedText variant="heading">Database non collegato</ThemedText>
          <ThemedText tone="muted" variant="caption">
            Nel file <ThemedText variant="caption">.env</ThemedText> mancano l’indirizzo e la chiave
            del progetto Supabase, quindi l’app non ha dove verificare le credenziali. L’accesso
            resterà bloccato finché non vengono inseriti.
          </ThemedText>
          <ThemedText tone="muted" variant="caption">
            Vedi DEPLOY.md per la procedura completa.
          </ThemedText>
        </Card>
      )}

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
        autoComplete="password"
        textContentType="password"
        placeholder="••••••••"
      />

      {error && (
        <ThemedText tone="error" variant="caption">
          {error}
        </ThemedText>
      )}

      <Button
        title="Accedi"
        onPress={onSubmit}
        loading={loading}
        disabled={!isSupabaseConfigured}
      />

      <View style={{ flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' }}>
        <ThemedText tone="muted" variant="caption">
          Non hai un account?
        </ThemedText>
        <Link href="/sign-up">
          <ThemedText tone="accent" variant="caption">
            Registrati
          </ThemedText>
        </Link>
      </View>
    </Screen>
  );
}
