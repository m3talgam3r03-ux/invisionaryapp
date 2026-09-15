import { useState } from 'react';

import { AvanzamentoRete } from '@/components/formazione/AvanzamentoRete';
import { CalendarioEventi } from '@/components/formazione/CalendarioEventi';
import { Corsi } from '@/components/formazione/Corsi';
import { Screen, Segmenti, type Segmento } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { t } from '@/i18n/it';
import { can } from '@/lib/permissions';

type Vista = 'corsi' | 'calendario' | 'rete';

/**
 * Formazione: corsi, calendario e avanzamento della rete.
 *
 * ── COSA È SPARITO ──
 * Due pulsanti larghi mezzo schermo in cima, «Calendario» e «Avanzamento
 * rete». Erano navigazione travestita da azione: un pulsante pieno promette
 * che succeda qualcosa, e invece ti spostava altrove. E occupavano la parte
 * più preziosa della schermata — la prima riga sotto il titolo — per due cose
 * che si aprono di rado, spingendo i corsi sotto la piega.
 *
 * Sono tre viste della stessa materia, quindi vanno nello stesso controllo a
 * segmenti dei Risultati. Che sia LO STESSO controllo non è un risparmio di
 * codice: è la ragione per cui un'app sembra fatta da una mano sola. Imparato
 * una volta, funziona dappertutto.
 *
 * ── IL PERMESSO DECIDE QUANTI SEGMENTI ──
 * «Avanzamento rete» esiste solo per chi la rete la guida. Prima c'era un
 * pulsante nascosto e, se ci si arrivava per indirizzo, un rimbalzo indietro.
 * Adesso il segmento semplicemente non c'è: un collaboratore ne vede due, e
 * due segmenti restano un controllo sensato.
 */
export default function FormazioneIndex() {
  const { profile } = useAuth();
  const vedeLaRete = can(profile, 'network.progress');
  const [vista, setVista] = useState<Vista>('corsi');

  const segmenti: Segmento<Vista>[] = [
    { valore: 'corsi', etichetta: t.formazione.corsi },
    { valore: 'calendario', etichetta: t.formazione.calendario },
  ];
  if (vedeLaRete) {
    segmenti.push({ valore: 'rete', etichetta: t.formazione.rete.breve });
  }

  return (
    <Screen
      scroll
      intestazione={
        <Segmenti
          segmenti={segmenti}
          valore={vista}
          onCambia={setVista}
          etichettaGruppo={t.formazione.segmenti}
        />
      }
    >
      {vista === 'corsi' && <Corsi />}
      {vista === 'calendario' && <CalendarioEventi />}
      {vista === 'rete' && vedeLaRete && <AvanzamentoRete />}
    </Screen>
  );
}
