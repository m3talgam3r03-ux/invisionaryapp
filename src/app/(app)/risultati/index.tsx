import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Classifiche } from '@/components/risultati/Classifiche';
import { Livello } from '@/components/risultati/Livello';
import { Premi } from '@/components/risultati/Premi';
import { Screen, Segmenti, type Segmento } from '@/components/ui';
import { t } from '@/i18n/it';

type Sezione = 'livello' | 'classifiche' | 'premi';

const SEGMENTI: readonly Segmento<Sezione>[] = [
  { valore: 'livello', etichetta: t.risultati.livello },
  { valore: 'classifiche', etichetta: t.risultati.classifiche },
  { valore: 'premi', etichetta: t.risultati.premi },
] as const;

/** Le sezioni raggiungibili da fuori, per i vecchi indirizzi che ora reindirizzano qui. */
function sezioneIniziale(valore: unknown): Sezione {
  return valore === 'classifiche' || valore === 'premi' ? valore : 'livello';
}

/**
 * Risultati: livello, classifiche e premi nello stesso posto.
 *
 * ── COSA È SPARITO ──
 * Tre schermate: «Rank», «Punti e premi» e «Classifica trader», che stavano in
 * tre rami diversi dell'app. Erano tre destinazioni per una domanda sola —
 * come sto andando — e la divisione seguiva il modo in cui il punteggio è
 * calcolato, che è una faccenda nostra.
 *
 * Si vedeva dal fatto che per tenerle separate avevamo dovuto SCRIVERE la
 * differenza: nel menu c'era una riga che spiegava che il rank è un livello e
 * i punti sono una valuta. Quando un'interfaccia ha bisogno di una nota per
 * giustificare la propria struttura, il problema è la struttura.
 *
 * ── PERCHÉ I SEGMENTI E NON TRE VOCI ──
 * Tre voci in un elenco dicono «tre posti». I segmenti dicono «un posto, tre
 * modi di guardarlo»: si cambia vista senza perdere il filo e senza tornare
 * indietro. È lo stesso controllo con cui Fitness tiene insieme riepilogo,
 * condivisione e allenamenti, che sono anche loro tre facce di una cosa sola.
 *
 * Il ponte fra le due metà adesso si legge dove serve: il podio dice che i
 * punti si spendono nel segmento accanto, e il segmento accanto è lì.
 *
 * ── NIENTE SPARISCE ──
 * Tutto quello che c'era nelle tre schermate è ancora qui, compresi il
 * dettaglio del calcolo, la condivisione del traguardo, il catalogo, lo
 * storico dei riscatti e il registro dei movimenti. «Semplice» non vuol dire
 * «meno cose»: vuol dire meno bivi per arrivarci.
 */
export default function Risultati() {
  const { sezione } = useLocalSearchParams<{ sezione?: string }>();
  const [attiva, setAttiva] = useState<Sezione>(() => sezioneIniziale(sezione));

  return (
    <Screen
      scroll
      intestazione={
        <Segmenti
          segmenti={SEGMENTI}
          valore={attiva}
          onCambia={setAttiva}
          etichettaGruppo={t.risultati.segmenti}
        />
      }
    >
      {attiva === 'livello' && <Livello />}
      {attiva === 'classifiche' && <Classifiche />}
      {attiva === 'premi' && <Premi />}
    </Screen>
  );
}
