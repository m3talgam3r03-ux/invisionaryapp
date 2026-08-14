import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Button, Card, EmptyState, Screen, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { useCourses } from '@/lib/courses';
import { can } from '@/lib/permissions';
import { useAvanzamentoCorsi, useAvanzamentoGlobale } from '@/lib/progress';
import { spacing } from '@/theme';

export default function FormazioneIndex() {
  const { data: courses, isLoading, isError, error } = useCourses();
  const { data: perCorso } = useAvanzamentoCorsi();
  const { data: globale } = useAvanzamentoGlobale();
  const { profile } = useAuth();
  const router = useRouter();
  const canSeeNetwork = can(profile, 'network.progress');

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button
          title={t.formazione.calendario}
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push('/formazione/calendario')}
        />
        {canSeeNetwork && (
          <Button
            title={t.formazione.avanzamentoRete}
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push('/formazione/rete')}
          />
        )}
      </View>

      {isLoading && <ThemedText tone="muted">{t.formazione.caricamentoCorsi}</ThemedText>}

      {isError && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText tone="error">{t.formazione.erroreCorsi}</ThemedText>
          <ThemedText tone="muted" variant="caption">
            {t.formazione.erroreCorsiDettaglio(
              error instanceof Error ? error.message : t.formazione.erroreSconosciuto,
            )}
          </ThemedText>
        </View>
      )}

      {/* Avanzamento complessivo: il numero che dice a colpo d'occhio a che punto sei */}
      {globale && globale.totale > 0 && (
        <Card style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ThemedText variant="label" tone="muted" style={{ flex: 1 }}>
              {t.formazione.avanzamentoGlobale}
            </ThemedText>
            <ThemedText variant="label" tone={globale.percentuale >= 100 ? 'gold' : 'muted'}>
              {globale.percentuale}%
            </ThemedText>
          </View>
          <ProgressBar percent={globale.percentuale} />
          <ThemedText tone="muted" variant="caption">
            {t.formazione.lezioniSu(globale.completate, globale.totale)}
          </ThemedText>
        </Card>
      )}

      {courses?.length === 0 && (
        <EmptyState title={t.formazione.nessunCorso} hint={t.formazione.nessunCorsoSuggerimento} />
      )}

      {courses?.map((c) => {
        const av = perCorso?.get(c.id);
        const completo = av ? av.percentuale >= 100 : false;
        return (
          <Pressable
        accessibilityRole="button"
            key={c.id}
            onPress={() =>
              router.push({ pathname: '/formazione/[courseId]', params: { courseId: c.id } })
            }
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Card style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <ThemedText variant="heading" style={{ flex: 1 }}>
                  {c.titolo}
                </ThemedText>
                {av && (
                  <ThemedText variant="label" tone={completo ? 'gold' : 'muted'}>
                    {completo ? t.formazione.completato : `${av.percentuale}%`}
                  </ThemedText>
                )}
              </View>

              {c.descrizione ? (
                <ThemedText tone="muted" variant="caption">
                  {c.descrizione}
                </ThemedText>
              ) : null}

              {av && av.totale > 0 && (
                <>
                  <ProgressBar percent={av.percentuale} />
                  <ThemedText tone="muted" variant="caption">
                    {t.formazione.lezioniSu(av.completate, av.totale)}
                  </ThemedText>
                </>
              )}
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
