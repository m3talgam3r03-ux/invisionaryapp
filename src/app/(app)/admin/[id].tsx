import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { ROLE_LABEL, t } from '@/i18n/it';
import { useAllProfiles, useProfileById, useUpdateProfile } from '@/lib/admin';
import { messaggioErrore } from '@/lib/errori';
import { can, canBeAssignedAsLeader, expectsLeader } from '@/lib/permissions';
import { ROLES, radius, spacing, useTheme, type Role } from '@/theme';

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

  if (me && !can(me, 'admin.panel')) {
    return <Redirect href="/" />;
  }
  if (isLoading || !role) {
    return (
      <Screen>
        <ThemedText tone="muted">{t.comune.caricamento}</ThemedText>
      </Screen>
    );
  }
  if (isError || !target) {
    return (
      <Screen>
        <ThemedText tone="error">{t.admin.utenteNonTrovato}</ThemedText>
      </Screen>
    );
  }

  const leaders = (allProfiles ?? []).filter(
    (p) => canBeAssignedAsLeader(p.role) && p.id !== target.id,
  );

  function save() {
    if (!role) return;
    update.mutate(
      { id: target!.id, role, leader_id: expectsLeader(role) ? leaderId : null },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText variant="title">{target.full_name || t.comune.senzaNome}</ThemedText>
      {me?.id === target.id && (
        <ThemedText tone="gold" variant="caption">
          {t.admin.staiModificandoTe}
        </ThemedText>
      )}

      <Card style={{ gap: spacing.md }}>
        <ThemedText variant="label" tone="muted">
          {t.admin.campoRuolo}
        </ThemedText>
        <View style={styles.chips}>
          {ROLES.map((r) => (
            <Chip key={r} label={ROLE_LABEL[r]} selected={role === r} onPress={() => setRole(r)} />
          ))}
        </View>
      </Card>

      {expectsLeader(role) && (
        <Card style={{ gap: spacing.md }}>
          <ThemedText variant="label" tone="muted">
            {t.admin.campoLeader}
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip
              label={t.admin.nessunLeader}
              selected={leaderId === null}
              onPress={() => setLeaderId(null)}
            />
            {leaders.map((l) => (
              <Chip
                key={l.id}
                label={l.full_name || t.comune.senzaNome}
                selected={leaderId === l.id}
                onPress={() => setLeaderId(l.id)}
              />
            ))}
          </ScrollView>
          {leaders.length === 0 && (
            <ThemedText tone="muted" variant="caption">
              {t.admin.nessunLeaderDisponibile}
            </ThemedText>
          )}
        </Card>
      )}

      {update.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(update.error, t.admin.salvataggioFallito)}
        </ThemedText>
      )}

      <Button title={t.comune.salva} onPress={save} loading={update.isPending} />
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
      accessibilityRole="button"
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
