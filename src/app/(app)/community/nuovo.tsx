import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Screen, TextField, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { messaggioErrore } from '@/lib/errori';
import { pickImage, useCreateFeedbackPost, type PickedImage } from '@/lib/feedback';
import { radius, spacing, useTheme } from '@/theme';
import { t } from '@/i18n/it';

export default function NuovoFeedback() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const create = useCreateFeedbackPost();

  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choosePhoto() {
    setError(null);
    try {
      const img = await pickImage();
      if (img) setPhoto(img);
      else setError(t.community.fotoNonScelta);
    } catch (e) {
      setError(messaggioErrore(e, t.community.selezioneFallita));
    }
  }

  function publish() {
    if (!body.trim() && !photo) {
      setError(t.community.vuoto);
      return;
    }
    setError(null);
    create.mutate(
      { body, photo, authorName: profile?.full_name ?? null },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <TextField
        label={t.community.messaggio}
        value={body}
        onChangeText={setBody}
        placeholder={t.community.messaggioEsempio}
        multiline
        numberOfLines={5}
        style={{ height: 120, textAlignVertical: 'top', paddingTop: spacing.md }}
      />

      {photo ? (
        <View style={{ gap: spacing.sm }}>
          <Image
            source={{ uri: `data:${photo.mimeType};base64,${photo.base64}` }}
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}
            contentFit="cover"
          />
          <Pressable onPress={() => setPhoto(null)} accessibilityRole="button">
            <ThemedText tone="accent" variant="caption">
              Rimuovi foto
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <Button title={t.community.aggiungiFoto} variant="secondary" onPress={choosePhoto} />
      )}

      {error && (
        <ThemedText tone="error" variant="caption">
          {error}
        </ThemedText>
      )}
      {create.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(create.error, t.community.pubblicazioneFallita)}
        </ThemedText>
      )}

      <Button title={t.community.pubblica} onPress={publish} loading={create.isPending} />

      <ThemedText tone="muted" variant="caption" style={{ textAlign: 'center' }}>
        Rispetta la rete: contenuti a scopo educativo e motivazionale.
      </ThemedText>
    </Screen>
  );
}
