import { useLocalSearchParams } from 'expo-router';

import { Button, Screen, ThemedText } from '@/components/ui';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { useLesson } from '@/lib/courses';
import { messaggioErrore } from '@/lib/errori';
import { useLessonProgress, useToggleLesson } from '@/lib/progress';
import { spacing } from '@/theme';

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { data: lesson, isLoading, isError } = useLesson(lessonId);
  const { data: completed } = useLessonProgress();
  const toggle = useToggleLesson();

  if (isLoading) {
    return (
      <Screen>
        <ThemedText tone="muted">Caricamento…</ThemedText>
      </Screen>
    );
  }
  if (isError || !lesson) {
    return (
      <Screen>
        <ThemedText tone="error">Lezione non trovata.</ThemedText>
      </Screen>
    );
  }

  const isDone = completed?.has(lesson.id) ?? false;

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      <ThemedText variant="title">{lesson.titolo}</ThemedText>
      <YouTubePlayer youtubeId={lesson.youtube_id} />

      <Button
        title={isDone ? '✓ Completata — annulla' : 'Segna come completata'}
        variant={isDone ? 'secondary' : 'primary'}
        loading={toggle.isPending}
        onPress={() => toggle.mutate({ lessonId: lesson.id, completed: isDone })}
      />

      {toggle.isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(toggle.error, 'Operazione non riuscita.')}
        </ThemedText>
      )}

      <ThemedText tone="muted" variant="caption">
        Contenuti a scopo educativo e informativo. Nessuna consulenza finanziaria personalizzata.
      </ThemedText>
    </Screen>
  );
}
