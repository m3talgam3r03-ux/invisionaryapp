import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, ThemedText, Colonna } from '@/components/ui';
import { useFeedbackPosts } from '@/lib/feedback';
import { messaggioErrore } from '@/lib/errori';
import { radius, spacing, useTheme } from '@/theme';
import type { FeedbackPost } from '@/types/models';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Community() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useFeedbackPosts();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Colonna>
        <View style={styles.actions}>
          <Button title="+ Nuovo feedback" onPress={() => router.push('/community/nuovo')} style={{ flex: 1 }} />
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
              <ThemedText tone="muted">Caricamento…</ThemedText>
            ) : isError ? (
              <EmptyState
                tone="error"
                title="Impossibile caricare la community"
                hint={messaggioErrore(error, 'Errore sconosciuto.')}
              />
            ) : (
              <EmptyState
                title="Ancora nessun feedback"
                hint="Condividi un traguardo o un pensiero con la tua rete."
              />
            )
          }
          renderItem={({ item }) => <PostCard post={item} />}
        />
      </Colonna>
    </SafeAreaView>
  );
}

function PostCard({ post }: { post: FeedbackPost }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.head}>
        <ThemedText variant="heading">{post.author_name || 'Membro'}</ThemedText>
        <ThemedText tone="muted" variant="caption">
          {formatDate(post.created_at)}
        </ThemedText>
      </View>
      {post.body ? <ThemedText>{post.body}</ThemedText> : null}
      {post.photo_url ? (
        <Image
          source={{ uri: post.photo_url }}
          style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}
          contentFit="cover"
          transition={150}
        />
      ) : null}
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
