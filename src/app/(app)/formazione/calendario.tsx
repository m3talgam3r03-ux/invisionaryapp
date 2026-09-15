import { Redirect } from 'expo-router';

/**
 * Il calendario eventi e' diventato un segmento di «Formazione»: e' una vista
 * della stessa materia, non un'altra schermata. L'indirizzo resta e
 * reindirizza, perche' i collegamenti vecchi devono continuare ad arrivare.
 */
export default function Reindirizza() {
  return <Redirect href="/formazione" />;
}
