import { Redirect, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ThemedText, Colonna } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { useAllProfiles } from '@/lib/admin';
import { can, expectsLeader } from '@/lib/permissions';
import { spacing, useTheme } from '@/theme';
import type { Profile } from '@/types/models';

export default function AdminUsers() {
  const { profile, isProfileLoading } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useAllProfiles();
  const router = useRouter();
  const { colors } = useTheme();

  if (isProfileLoading && !profile) {
    return null;
  }
  if (!can(profile, 'admin.panel')) {
    return <Redirect href="/" />;
  }

  const nameById = new Map((data ?? []).map((p) => [p.id, p.full_name]));

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Colonna>
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.textMuted} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListHeaderComponent={
            <ThemedText tone="muted" variant="caption" style={{ marginBottom: spacing.md }}>
              {t.admin.introElenco}
            </ThemedText>
          }
          ListEmptyComponent={
            isLoading ? (
              <ThemedText tone="muted">{t.admin.caricamentoUtenti}</ThemedText>
            ) : isError ? (
              <ThemedText tone="error" variant="caption">
                {error instanceof Error ? error.message : t.comune.errore}
              </ThemedText>
            ) : (
              <ThemedText tone="muted">{t.admin.nessunUtente}</ThemedText>
            )
          }
          renderItem={({ item }) => (
            <UserRow
              profile={item}
              leaderName={item.leader_id ? nameById.get(item.leader_id) ?? null : null}
              onPress={() => router.push({ pathname: '/admin/[id]', params: { id: item.id } })}
            />
          )}
        />
      </Colonna>
    </SafeAreaView>
  );
}

function UserRow({
  profile,
  leaderName,
  onPress,
}: {
  profile: Profile;
  leaderName: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ThemedText variant="heading" style={{ flex: 1 }}>
            {profile.full_name || t.comune.senzaNome}
          </ThemedText>
          <ThemedText tone="gold" variant="label">
            {ROLE_LABEL[profile.role]}
          </ThemedText>
        </View>
        {expectsLeader(profile.role) && (
          <ThemedText tone="muted" variant="caption">
            {t.admin.leaderDi(leaderName ?? t.admin.leaderNonAssegnato)}
          </ThemedText>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
});
