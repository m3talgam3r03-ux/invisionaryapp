import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card, Screen, ThemedText } from '@/components/ui';
import { useCourse, useLessons } from '@/lib/courses';
import { messaggioErrore } from '@/lib/errori';
import { useLessonProgress } from '@/lib/progress';
import { spacing } from '@/theme';

export default function CourseDetail() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { data: course } = useCourse(courseId);
  const { data: lessons, isLoading, isError, error } = useLessons(courseId);
  const { data: completed } = useLessonProgress();

  const doneCount = lessons?.filter((l) => completed?.has(l.id)).length ?? 0;

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {course && (
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="title">{course.titolo}</ThemedText>
          {course.descrizione ? <ThemedText tone="muted">{course.descrizione}</ThemedText> : null}
          {lessons && lessons.length > 0 && (
            <ThemedText tone="gold" variant="label">
              {doneCount}/{lessons.length} completate
            </ThemedText>
          )}
        </View>
      )}

      {isLoading && <ThemedText tone="muted">Caricamento lezioni…</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(error, 'Errore nel caricamento delle lezioni.')}
        </ThemedText>
      )}
      {lessons?.length === 0 && <ThemedText tone="muted">Nessuna lezione in questo corso.</ThemedText>}

      {lessons?.map((lesson, i) => {
        const isDone = completed?.has(lesson.id) ?? false;
        return (
          <Pressable
            accessibilityRole="button"
            key={lesson.id}
            onPress={() =>
              router.push({ pathname: '/formazione/lezione/[lessonId]', params: { lessonId: lesson.id } })
            }
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <ThemedText tone={isDone ? 'success' : 'muted'} variant="heading">
                {isDone ? '✓' : String(i + 1)}
              </ThemedText>
              <ThemedText style={{ flex: 1 }}>{lesson.titolo}</ThemedText>
              <ThemedText tone="muted">›</ThemedText>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
