import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAllProfiles, useProfileById, useUpdateProfile } from '@/lib/admin';
import { ROLES, radius, spacing, useTheme, type Role } from '@/theme';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Amministratore',
  leader: 'Leader',
  collaborator: 'Collaboratore',
};

export default function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile: me } = useAuth();
  const { data: target, isLoading, isError } = useProfileById(id);
  const { data: allProfiles } = useAllProfiles();
  const update = useUpdateProfile();

  const [role, setRole] = useState<Role | null>(null);
  const [leaderId, setLeaderId] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setRole(target.role);
      setLeaderId(target.leader_id);
    }
  }, [target]);

  if (me && me.role !== 'admin') {
    return <Redirect href="/" />;
  }
  if (isLoading || !role) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }
  if (isError || !target) {
    return (
      <Screen>
        <ThemedText tone="error">Utente non trovato.</ThemedText>
      </Screen>
    );
  }

  const leaders = (allProfiles ?? []).filter((p) => p.role === 'leader' && p.id !== target.id);

  function save() {
    if (!role) return;
    update.mutate(
      { id: target!.id, role, leader_id: role === 'collaborator' ? leaderId : null },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText variant="title">{target.full_name || 'Senza nome'}</ThemedText>
      {me?.id === target.id && (
        <ThemedText tone="gold" variant="caption">
          Stai modificando il tuo profilo.
        </ThemedText>
      )}

      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="label" tone="muted">
          Ruolo
        </ThemedText>
        <View style={styles.chips}>
          {ROLES.map((r) => (
            <Chip key={r} label={ROLE_LABEL[r]} selected={role === r} onPress={() => setRole(r)} />
          ))}
        </View>
      </Card>

      {role === 'collaborator' && (
        <Card style={{ gap: spacing.md }}>
          <ThemedText variant="label" tone="muted">
            Leader
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="— Nessuno" selected={leaderId === null} onPress={() => setLeaderId(null)} />
            {leaders.map((l) => (
              <Chip
                key={l.id}
                label={l.full_name || 'Senza nome'}
                selected={leaderId === l.id}
                onPress={() => setLeaderId(l.id)}
              />
            ))}
          </ScrollView>
          {leaders.length === 0 && (
            <ThemedText tone="muted" variant="caption">
              Nessun leader disponibile: assegna prima il ruolo «Leader» a un utente.
            </ThemedText>
          )}
        </Card>
      )}

      {update.isError && (
        <ThemedText tone="error" variant="caption">
          {update.error instanceof Error ? update.error.message : 'Salvataggio non riuscito.'}
        </ThemedText>
      )}

      <Button title="Salva" onPress={save} loading={update.isPending} />
    </Screen>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accent : colors.surface,
      }}
    >
      <ThemedText variant="caption" style={{ color: selected ? '#FFFFFF' : colors.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
