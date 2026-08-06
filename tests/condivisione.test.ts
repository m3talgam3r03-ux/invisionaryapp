/**
 * Test della condivisione social (src/lib/condivisione.ts).
 *
 * Questi test presidiano una cosa sola, e non è grafica: che dall'app non possa
 * uscire un'immagine che promette guadagni. Una card postata su Instagram col
 * marchio dell'azienda sopra è pubblicità dell'azienda, anche se l'ha scritta
 * un collaboratore.
 *
 * Le regole sono volutamente larghe: un falso positivo costa una riscrittura,
 * un falso negativo costa un post che promette rendimenti.
 */
import { describe, expect, it } from 'vitest';

import {
  costruisciCard,
  nomeFileCard,
  STORIES,
  verificaTesto,
  type MotivoBlocco,
} from '@/lib/condivisione';

/** Comodo per asserire motivo e frase in una riga. */
function blocco(testo: string): MotivoBlocco | 'passa' {
  const e = verificaTesto(testo);
  return e.ok ? 'passa' : e.motivo;
}

describe('quello che finisce sulla card è una lista chiusa', () => {
  it('il rank porta livello e punti, mai un importo', () => {
    const c = costruisciCard({ tipo: 'rank', rank: 'Asso di cuori', punti: 1247.3 });
    expect(c.valore).toBe('Asso di cuori');
    expect(c.sottotitolo).toBe('1247 punti di percorso');
    // Nessun campo della card può contenere una valuta: non esiste il parametro.
    for (const v of Object.values(c)) {
      expect(String(v)).not.toMatch(/€|\$|euro/i);
    }
  });

  it('la formazione porta un conteggio, con il singolare giusto', () => {
    expect(costruisciCard({ tipo: 'formazione', lezioniCompletate: 1 }).titolo).toBe(
      'Lezione completata',
    );
    expect(costruisciCard({ tipo: 'formazione', lezioniCompletate: 12 }).titolo).toBe(
      'Lezioni completate',
    );
    expect(
      costruisciCard({ tipo: 'formazione', lezioniCompletate: 12, corso: 'Basi del network' })
        .sottotitolo,
    ).toBe('Percorso «Basi del network»');
  });

  it('numeri assurdi non producono card assurde', () => {
    expect(costruisciCard({ tipo: 'formazione', lezioniCompletate: -5 }).valore).toBe('0');
    expect(costruisciCard({ tipo: 'costanza', giorni: 3.7 }).valore).toBe('3');
    expect(costruisciCard({ tipo: 'rank', rank: 'Due', punti: -10 }).sottotitolo).toBe(
      '0 punti di percorso',
    );
  });

  it('il disclaimer c’è sempre e dice le due cose che deve dire', () => {
    const card = [
      costruisciCard({ tipo: 'rank', rank: 'Re', punti: 900 }),
      costruisciCard({ tipo: 'formazione', lezioniCompletate: 4 }),
      costruisciCard({ tipo: 'costanza', giorni: 30 }),
    ];
    for (const c of card) {
      expect(c.disclaimer).toMatch(/nessuna promessa di guadagno/i);
      expect(c.disclaimer).toMatch(/consulenza finanziaria/i);
    }
  });
});

describe('IL TEST CHE CONTA: il testo libero non lascia passare promesse', () => {
  it('blocca gli importi in ogni forma in cui si scrivono', () => {
    expect(blocco('Ho fatto 3.000 € questo mese')).toBe('importo');
    expect(blocco('€500 in una settimana')).toBe('importo');
    expect(blocco('1500 euro netti')).toBe('importo');
    expect(blocco('$2000 di commissioni')).toBe('importo');
    expect(blocco('primi 10k')).toBe('importo');
    expect(blocco('2 milioni di fatturato')).toBe('importo');
  });

  it('blocca il guadagno anche quando non c’è una cifra', () => {
    expect(blocco('Come ho guadagnato con Invisionary')).toBe('guadagno');
    expect(blocco('Rendimenti costanti da sei mesi')).toBe('guadagno');
    expect(blocco('La mia rendita passiva')).toBe('guadagno');
    expect(blocco('Risultati al mese incredibili')).toBe('guadagno');
    expect(blocco('Ho raddoppiato in tre mesi')).toBe('guadagno');
    expect(blocco('ROI del percorso')).toBe('guadagno');
  });

  it('blocca le garanzie, che è la cosa che non si può dire mai', () => {
    expect(blocco('Metodo garantito')).toBe('garanzia');
    expect(blocco('Senza rischi')).toBe('garanzia');
    expect(blocco('Soldi facili per tutti')).toBe('garanzia');
    expect(blocco('Verso la libertà finanziaria')).toBe('garanzia');
  });

  it('blocca email e numeri di telefono', () => {
    expect(blocco('Scrivimi a mario.rossi@example.com')).toBe('dato_personale');
    expect(blocco('Chiamami al +39 340 1234567')).toBe('dato_personale');
    expect(blocco('3401234567')).toBe('dato_personale');
  });

  it('lascia passare quello che è legittimo', () => {
    expect(blocco('Nuovo livello raggiunto, avanti così')).toBe('passa');
    expect(blocco('Dodici lezioni completate questo mese')).toBe('passa');
    expect(blocco('Grazie alla squadra per il supporto')).toBe('passa');
    expect(blocco('')).toBe('passa');
    expect(blocco('   ')).toBe('passa');
    expect(blocco('30 giorni di costanza')).toBe('passa');
  });

  it('dice DOVE è il problema, non solo che c’è', () => {
    // Chi non sa quale parola ha fatto scattare la regola riscrive a caso
    // finché non passa, ed è il modo migliore per insegnare ad aggirarla.
    const e = verificaTesto('Sono felicissimo del percorso, ho guadagnato tanto quest’anno');
    expect(e.ok).toBe(false);
    if (e.ok) return;
    expect(e.frase).toContain('guadagn');
    expect(e.frase.length).toBeLessThan(60);
  });

  it('nel dubbio blocca: è il verso giusto in cui sbagliare', () => {
    // Un falso positivo costa una riscrittura; un falso negativo costa un post
    // che promette guadagni col marchio dell'azienda sopra.
    expect(blocco('Il mio fatturato personale')).toBe('guadagno');
    expect(blocco('x3 rispetto all’anno scorso')).toBe('guadagno');
  });
});

describe('formato Stories', () => {
  it('è 1080×1920 con le zone che le app coprono', () => {
    expect(STORIES.larghezza).toBe(1080);
    expect(STORIES.altezza).toBe(1920);
    // Il contenuto deve stare fra i due margini, altrimenti finisce sotto
    // l'interfaccia di Instagram e non lo legge nessuno.
    expect(STORIES.margineAlto + STORIES.margineBasso).toBeLessThan(STORIES.altezza / 2);
  });
});

describe('nome del file', () => {
  it('non contiene nomi di persona: il file può finire in una cartella condivisa', () => {
    expect(nomeFileCard('rank', new Date(Date.UTC(2026, 7, 6)))).toBe(
      'invisionary-rank-2026-08-06.png',
    );
    expect(nomeFileCard('formazione', new Date('boh'))).toBe('invisionary-formazione.png');
  });
});
