/**
 * Logica pura della dettatura: tipi e trasformazioni di testo.
 *
 * L'accesso al modulo nativo vive in `src/hooks/use-dictation.ts`, non qui:
 * questo file resta importabile e testabile ovunque, anche fuori da React
 * Native (lo usa `scripts/eval-brain.mjs`).
 */

export type DictationResultEvent = {
  isFinal: boolean;
  results: { transcript: string }[];
};

export type DictationErrorEvent = { error: string; message?: string };

export type Subscription = { remove: () => void };

export type SpeechRecognition = {
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: ((event: 'result', listener: (e: DictationResultEvent) => void) => Subscription) &
    ((event: 'error', listener: (e: DictationErrorEvent) => void) => Subscription) &
    ((event: 'end' | 'start' | 'nomatch', listener: () => void) => Subscription);
};

/** Estrae il testo da un evento di riconoscimento. */
export function transcriptFrom(event: DictationResultEvent): string {
  const first = event?.results?.[0]?.transcript ?? '';
  return first.trim();
}

/**
 * Unisce ciò che l'utente aveva già scritto con quanto dettato.
 * La dettatura si accoda invece di sovrascrivere: chi scrive metà domanda e
 * poi detta il resto non perde quanto digitato.
 */
export function mergeDictation(existing: string, dictated: string): string {
  const base = existing.trimEnd();
  const add = dictated.trim();
  if (!add) return existing;
  if (!base) return add;
  // Se la frase precedente è chiusa, la dettatura comincia una frase nuova.
  return /[.!?]$/.test(base) ? `${base} ${capitalize(add)}` : `${base} ${add}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
