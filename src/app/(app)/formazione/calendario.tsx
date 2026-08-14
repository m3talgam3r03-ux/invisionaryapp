import { Card, Screen, ThemedText } from '@/components/ui';
import { messaggioErrore } from '@/lib/errori';
import { useEvents } from '@/lib/events';
import { spacing } from '@/theme';

function formatDateTimeIT(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Calendario() {
  const { data: events, isLoading, isError, error } = useEvents();

  return (
    <Screen scroll contentStyle={{ gap: spacing.lg }}>
      {isLoading && <ThemedText tone="muted">Caricamento eventi…</ThemedText>}
      {isError && (
        <ThemedText tone="error" variant="caption">
          {messaggioErrore(error, 'Errore nel caricamento del calendario.')}
        </ThemedText>
      )}
      {events?.length === 0 && <ThemedText tone="muted">Nessun evento in programma.</ThemedText>}

      {events?.map((ev) => (
        <Card key={ev.id} style={{ gap: spacing.xs }}>
          <ThemedText tone="gold" variant="label">
            {formatDateTimeIT(ev.start_at)}
          </ThemedText>
          <ThemedText variant="heading">{ev.titolo}</ThemedText>
          {ev.descrizione ? (
            <ThemedText tone="muted" variant="caption">
              {ev.descrizione}
            </ThemedText>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
