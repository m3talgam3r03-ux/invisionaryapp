import { Redirect } from 'expo-router';

/**
 * La classifica trader e' confluita in «Risultati → Classifiche», accanto a
 * quella di rete: rispondono alla stessa domanda, e tenerle in due rami
 * diversi dell'app obbligava a sapere COME l'abbiamo calcolata per sapere dove
 * cercarla. L'indirizzo resta e reindirizza.
 */
export default function Reindirizza() {
  return <Redirect href={{ pathname: '/risultati', params: { sezione: 'classifiche' } }} />;
}
