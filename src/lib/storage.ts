/**
 * Percorsi dei file su Supabase Storage.
 *
 * Serve a una cosa sola, ma importante: quando si cancella un post della
 * Community bisogna cancellare anche la foto. Il post conserva l'URL pubblico,
 * non il percorso, e l'API di Storage vuole il percorso. Senza questa
 * conversione le foto resterebbero nel bucket per sempre — e siccome il bucket
 * è pubblico, resterebbero anche RAGGIUNGIBILI da chi conosce l'indirizzo,
 * dopo che chi le ha pubblicate ha chiesto di toglierle.
 *
 * Funzione pura, così si testa senza rete.
 */

/**
 * Da URL pubblico a percorso dentro il bucket.
 *
 * Un URL di Supabase Storage è fatto così:
 *   https://xxx.supabase.co/storage/v1/object/public/<bucket>/<percorso>
 *
 * Restituisce `null` se l'URL non è di questo bucket: meglio non cancellare
 * niente che cancellare il file sbagliato.
 */
export function percorsoDaUrlPubblico(url: string | null | undefined, bucket: string): string | null {
  if (!url || !bucket) return null;

  const segno = `/storage/v1/object/public/${bucket}/`;
  const taglio = url.indexOf(segno);
  if (taglio === -1) return null;

  const percorso = url.slice(taglio + segno.length);
  // La query string (`?t=...` per invalidare la cache) non fa parte del nome.
  const pulito = percorso.split('?')[0].split('#')[0];
  if (pulito === '') return null;

  // I nomi dei file arrivano codificati nell'URL: `%20` deve tornare spazio,
  // altrimenti si cerca di cancellare un file che non esiste con quel nome.
  try {
    return decodeURIComponent(pulito);
  } catch {
    // Percentuali malformate: meglio il nome grezzo che niente.
    return pulito;
  }
}
