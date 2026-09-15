import { Redirect } from 'expo-router';

/**
 * L'avanzamento della rete e' diventato un segmento di «Formazione», visibile
 * solo a chi la rete la guida. L'indirizzo resta e reindirizza.
 */
export default function Reindirizza() {
  return <Redirect href="/formazione" />;
}
