import { useCallback, useEffect, useRef, useState } from 'react';

import {
  transcriptFrom,
  type DictationErrorEvent,
  type DictationResultEvent,
  type SpeechRecognition,
} from '@/lib/dictation';

/**
 * Accesso difensivo al modulo nativo.
 *
 * `expo-speech-recognition` chiama `requireNativeModule` al momento dell'import:
 * su Expo Go — dove il modulo nativo non esiste — un import statico farebbe
 * crashare l'app all'avvio. Qui il caricamento è pigro e protetto, così la
 * dettatura semplicemente non compare dove non è disponibile. Vale anche come
 * rete di sicurezza sul rischio di compatibilità: il pacchetto è pubblicato
 * per SDK 56 e il progetto è su SDK 57.
 */
let cached: SpeechRecognition | null | undefined;

function getSpeechRecognition(): SpeechRecognition | null {
  if (cached !== undefined) return cached;
  try {
    // require letterale: Metro deve poter includere il pacchetto nel bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: SpeechRecognition;
    };
    cached = mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

/** True solo dove il modulo nativo è realmente presente (development build). */
function isDictationAvailable(): boolean {
  return getSpeechRecognition() !== null;
}

/** Riconoscimento in italiano, sul dispositivo quando il sistema lo consente. */
const OPTIONS = {
  lang: 'it-IT',
  interimResults: true,
  continuous: false,
  requiresOnDeviceRecognition: false,
  addsPunctuation: true,
};

type Options = {
  /** Riceve il testo definitivo quando la dettatura si chiude. */
  onFinal: (text: string) => void;
  /** Riceve il testo provvisorio, per mostrarlo mentre si parla. */
  onPartial?: (text: string) => void;
};

/**
 * Dettatura vocale (voce → testo) tramite il riconoscimento di sistema.
 * L'audio non lascia il dispositivo quando il sistema usa il modello locale.
 *
 * `available` è false su Expo Go e ovunque il modulo nativo non sia presente:
 * in quel caso la UI deve semplicemente non mostrare il microfono.
 */
export function useDictation({ onFinal, onPartial }: Options) {
  const [available] = useState(isDictationAvailable);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finalRef = useRef('');

  // I callback cambiano a ogni render: si tengono in ref per non ricreare i
  // listener nativi (e perdere eventi) a ogni battuta di tasto.
  const onFinalRef = useRef(onFinal);
  const onPartialRef = useRef(onPartial);
  useEffect(() => {
    onFinalRef.current = onFinal;
    onPartialRef.current = onPartial;
  });

  useEffect(() => {
    const mod = getSpeechRecognition();
    if (!mod) return;

    const subs = [
      mod.addListener('result', (e: DictationResultEvent) => {
        const text = transcriptFrom(e);
        if (!text) return;
        if (e.isFinal) finalRef.current = text;
        else onPartialRef.current?.(text);
      }),
      mod.addListener('error', (e: DictationErrorEvent) => {
        // "no-speech" è l'esito normale di chi apre il microfono e non parla:
        // segnalarlo come errore sarebbe solo rumore.
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setError(e.message || 'Dettatura non riuscita.');
        }
        setListening(false);
      }),
      mod.addListener('end', () => {
        setListening(false);
        const text = finalRef.current;
        finalRef.current = '';
        if (text) onFinalRef.current(text);
      }),
    ];

    return () => {
      subs.forEach((s) => s.remove());
      try {
        mod.abort();
      } catch {
        // già fermo
      }
    };
  }, []);

  const start = useCallback(async () => {
    const mod = getSpeechRecognition();
    if (!mod) return;
    setError(null);

    try {
      const current = await mod.getPermissionsAsync();
      if (!current.granted) {
        const asked = await mod.requestPermissionsAsync();
        if (!asked.granted) {
          setError('Permesso microfono negato. Puoi abilitarlo dalle impostazioni.');
          return;
        }
      }
      finalRef.current = '';
      setListening(true);
      mod.start(OPTIONS);
    } catch (e) {
      setListening(false);
      setError(e instanceof Error ? e.message : 'Dettatura non disponibile.');
    }
  }, []);

  const stop = useCallback(() => {
    const mod = getSpeechRecognition();
    if (!mod) return;
    try {
      mod.stop(); // chiude e restituisce il risultato definitivo
    } catch {
      setListening(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else void start();
  }, [listening, start, stop]);

  return { available, listening, error, start, stop, toggle };
}
