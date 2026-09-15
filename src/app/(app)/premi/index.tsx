import { Redirect } from 'expo-router';

/**
 * Questa schermata e' confluita in «Risultati», insieme alle altre due che
 * rispondevano alla stessa domanda. L'indirizzo resta e reindirizza: i vecchi
 * collegamenti — una notifica, un messaggio, un segnalibro — devono continuare
 * ad arrivare da qualche parte, e arrivare al segmento giusto.
 */
export default function Reindirizza() {
  return <Redirect href={{ pathname: '/risultati', params: { sezione: 'premi' } }} />;
}
