import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toSpeech } from '@/lib/speech';

const PREF_KEY = 'invisionary.speech.autoRead';
/** Voce italiana. Ritmo leggermente sotto il normale: le risposte sono dense. */
const OPTIONS: Speech.SpeechOptions = { language: 'it-IT', rate: 0.96, pitch: 1.0 };

/**
 * Lettura vocale delle risposte dell'agente (expo-speech, voci di sistema).
 *
 * Niente rete e nessun costo: la sintesi avviene sul dispositivo, quindi la
 * risposta non esce dal telefono. `autoRead` è la preferenza persistita per
 * leggere automaticamente ogni nuova risposta.
 */
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoRead, setAutoReadState] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => {
        if (mounted.current && v === '1') setAutoReadState(true);
      })
      .catch(() => {
        // preferenza best-effort
      });
    return () => {
      mounted.current = false;
      // Uscendo dalla schermata la voce non deve proseguire.
      Speech.stop();
    };
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (id: string, text: string) => {
      // Un secondo tocco sullo stesso messaggio interrompe.
      if (speakingId === id) {
        stop();
        return;
      }
      const spoken = toSpeech(text);
      if (!spoken) return;

      Speech.stop(); // sostituisce quanto in corso invece di accodarsi
      setSpeakingId(id);
      Speech.speak(spoken, {
        ...OPTIONS,
        onDone: () => {
          if (mounted.current) setSpeakingId((cur) => (cur === id ? null : cur));
        },
        onStopped: () => {
          if (mounted.current) setSpeakingId((cur) => (cur === id ? null : cur));
        },
        onError: () => {
          if (mounted.current) setSpeakingId((cur) => (cur === id ? null : cur));
        },
      });
    },
    [speakingId, stop],
  );

  const setAutoRead = useCallback(
    (value: boolean) => {
      setAutoReadState(value);
      AsyncStorage.setItem(PREF_KEY, value ? '1' : '0').catch(() => {
        // preferenza best-effort
      });
      if (!value) stop();
    },
    [stop],
  );

  return { speakingId, speak, stop, autoRead, setAutoRead };
}
