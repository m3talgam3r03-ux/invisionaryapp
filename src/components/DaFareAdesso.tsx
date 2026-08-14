import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Card, ThemedText } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { usePrenotazioni } from '@/lib/calendario';
import { impegniDelGiorno, tuttoInOrdine, type Impegno } from '@/lib/oggi';
import { can } from '@/lib/permissions';
import { useRenewals } from '@/lib/renewals';
import { spacing, useTheme } from '@/theme';

/**
 * Cosa richiede attenzione, in cima alla dashboard.
 *
 * Prende il posto del riquadro «per ruolo», che descriveva l'app invece di
 * dire come vanno le cose. Non c'è un `if (ruolo)` qui dentro: il perimetro dei
 * dati lo decide la RLS (il collaboratore riceve i propri rinnovi, il leader
 * quelli della rete) e l'unica domanda sui permessi — posso approvare? — la fa
 * `can()`, come ovunque nell'app.
 *
 * Le due query sono le stesse dello scadenzario e del calendario: TanStack
 * Query le condivide per chiave, quindi aprire quelle schermate non rifà il
 * lavoro.
 */
export function DaFareAdesso() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const { data: rinnovi, isLoading: rinnoviInCorso } = useRenewals();
  const { data: prenotazioni, isLoading: prenotazioniInCorso } = usePrenotazioni();

  if (!profile) return null;

  // Finché non è arrivato tutto, un «niente in sospeso» sarebbe una bugia.
  const inCaricamento = rinnoviInCorso || prenotazioniInCorso;

  // La domanda qui è «esistono richieste che potrebbero riguardarmi?», non
  // «posso approvare questa riga»: le righe non si sono ancora guardate. Il sì
  // sulla singola richiesta lo dà lo scadenzario, e quello vero il database.
  const puoApprovare = can(profile, 'renewals.approveAny');

  const impegni = impegniDelGiorno(
    rinnovi ?? [],
    prenotazioni ?? [],
    new Date(),
    profile.id,
    puoApprovare,
  );

  return (
    <Card style={{ gap: spacing.sm }}>
      <ThemedText variant="heading">{t.dashboard.oggi.titolo}</ThemedText>

      {inCaricamento ? (
        <ThemedText tone="muted" variant="caption">
          {t.comune.caricamento}
        </ThemedText>
      ) : tuttoInOrdine(impegni) ? (
        <ThemedText tone="muted" variant="caption">
          {t.dashboard.oggi.tuttoOk}
        </ThemedText>
      ) : (
        impegni.map((i) => (
          <Pressable
            key={i.tipo}
            accessibilityRole="button"
            accessibilityLabel={`${testo(i)}. ${azione(i)}`}
            onPress={() => router.push(i.tipo === 'appuntamento' ? '/calendario' : '/renewals')}
            style={[styles.riga, { borderColor: colors.border }]}
          >
            <ThemedText style={[styles.pallino, { color: colore(i, colors) }]}>●</ThemedText>
            <ThemedText variant="caption" style={{ flex: 1 }}>
              {testo(i)}
            </ThemedText>
            <ThemedText tone="muted" variant="caption">
              →
            </ThemedText>
          </Pressable>
        ))
      )}
    </Card>
  );
}

function testo(i: Impegno): string {
  switch (i.tipo) {
    case 'scaduti':
      return t.dashboard.oggi.scaduti(i.quanti);
    case 'da_approvare':
      return t.dashboard.oggi.daApprovare(i.quanti);
    case 'in_scadenza':
      return t.dashboard.oggi.inScadenza(i.quanti, i.giorni);
    case 'appuntamento': {
      const quando = quandoLeggibile(i.quando);
      return i.conChi
        ? t.dashboard.oggi.appuntamentoCon(quando, i.conChi)
        : t.dashboard.oggi.appuntamento(quando);
    }
  }
}

function azione(i: Impegno): string {
  return i.tipo === 'appuntamento'
    ? t.dashboard.oggi.apriCalendario
    : t.dashboard.oggi.apriScadenzario;
}

/** Rosso per ciò che è già in ritardo, oro per ciò che aspetta me. */
function colore(i: Impegno, colors: { accentText: string; gold: string; textMuted: string }): string {
  if (i.tipo === 'scaduti') return colors.accentText;
  if (i.tipo === 'da_approvare') return colors.gold;
  return colors.textMuted;
}

function quandoLeggibile(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pallino: { fontSize: 10 },
});
