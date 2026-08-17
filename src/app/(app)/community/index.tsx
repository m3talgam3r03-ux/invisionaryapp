import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, ThemedText, Colonna } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { messaggioErrore } from '@/lib/errori';
import { useDeleteFeedbackPost, useFeedbackPosts } from '@/lib/feedback';
import { radius, spacing, useTheme } from '@/theme';
import type { FeedbackPost } from '@/types/models';
import { t } from '@/i18n/it';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Community() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useFeedbackPosts();
  const { profile } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Colonna>
        <View style={styles.actions}>
          <Button title={t.community.nuovoFeedback} onPress={() => router.push('/community/nuovo')} style={{ flex: 1 }} />
        </View>
  
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textMuted} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            isLoading ? (
              <ThemedText tone="muted">{t.community.caricamento}</ThemedText>
            ) : isError ? (
              <EmptyState
                tone="error"
                title={t.community.erroreElenco}
                hint={messaggioErrore(error, t.comune.errore)}
              />
            ) : (
              <EmptyState
                title={t.community.vuota}
                hint={t.community.vuotaSuggerimento}
              />
            )
          }
          renderItem={({ item }) => (
            // Cancellare il proprio è un diritto, non una gentilezza: quello
            // che si pubblica qui lo vede tutta la rete, foto compresa.
            <PostCard post={item} mio={item.owner_id === profile?.id} />
          )}
        />
      </Colonna>
    </SafeAreaView>
  );
}

function PostCard({ post, mio }: { post: FeedbackPost; mio: boolean }) {
  const { colors } = useTheme();
  const elimina = useDeleteFeedbackPost();
  const [conferma, setConferma] = useState(false);

  const autore = post.author_name || t.community.autoreIgnoto;

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <ThemedText variant="heading">{autore}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {formatDate(post.created_at)}
        </ThemedText>
      </View>
      {post.body ? <ThemedText>{post.body}</ThemedText> : null}
      {post.photo_url ? (
        <Image
          source={{ uri: post.photo_url }}
          // Senza, uno screen reader annuncia «immagine» e basta. Non si può
          // descrivere una foto che non si è vista, ma si può dire di chi è.
          accessibilityLabel={t.community.fotoDi(autore)}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}
          contentFit="cover"
          transition={150}
        />
      ) : null}

      {mio &&
        (conferma ? (
          <View style={{ gap: spacing.sm }}>
            <ThemedText tone="error" variant="caption">
              {post.photo_url ? t.community.confermaConFoto : t.community.conferma}
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title={t.community.elimina}
                style={{ flex: 1 }}
                loading={elimina.isPending}
                onPress={() => elimina.mutate({ id: post.id, photo_url: post.photo_url })}
              />
              <Button
                title={t.comune.annulla}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setConferma(false)}
              />
            </View>
            {elimina.isError && (
              <ThemedText tone="error" variant="caption">
                {messaggioErrore(elimina.error, t.community.eliminazioneFallita)}
              </ThemedText>
            )}
          </View>
        ) : (
          <Button title={t.community.elimina} variant="secondary" onPress={() => setConferma(true)} />
        ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
