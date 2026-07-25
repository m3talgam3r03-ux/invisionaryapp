import { Redirect, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAllProfiles } from '@/lib/admin';
import { spacing, useTheme, type Role } from '@/theme';
import type { Profile } from '@/types/models';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  leader: 'Leader',
  collaborator: 'Collaboratore',
};

export default function AdminUsers() {
  const { profile, isProfileLoading } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useAllProfiles();
  const router = useRouter();
  const { colors } = useTheme();

  if (isProfileLoading && !profile) {
    return null;
  }
  if (profile?.role !== 'admin') {
    return <Redirect href="/" />;
  }

  const nameById = new Map((data ?? []).map((p) => [p.id, p.full_name]));

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
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
            Assegna ruoli e gerarchia. I nuovi utenti si registrano come collaboratori; creazione ed
            eliminazione account avvengono da Supabase.
          </ThemedText>
        }
        ListEmptyComponent={
          isLoading ? (
            <ThemedText tone="muted">Caricamento utenti…</ThemedText>
          ) : isError ? (
            <ThemedText tone="error" variant="caption">
              {error instanceof Error ? error.message : 'Errore nel caricamento.'}
            </ThemedText>
          ) : (
            <ThemedText tone="muted">Nessun utente.</ThemedText>
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
            {profile.full_name || 'Senza nome'}
          </ThemedText>
          <ThemedText tone="gold" variant="label">
            {ROLE_LABEL[profile.role]}
          </ThemedText>
        </View>
        {profile.role === 'collaborator' && (
          <ThemedText tone="muted" variant="caption">
            Leader: {leaderName ?? 'non assegnato'}
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
