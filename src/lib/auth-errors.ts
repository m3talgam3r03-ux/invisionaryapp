/**
 * Traduzione degli errori di autenticazione in messaggi utili.
 *
 * Supabase (e il browser) restituiscono stringhe tecniche in inglese —
 * "Failed to fetch", "Invalid login credentials" — che a chi usa l'app non
 * dicono nulla e, peggio, fanno pensare a una password sbagliata quando invece
 * il server non è raggiungibile.
 *
 * Funzione pura: è la parte testabile del login.
 */

export function authErrorMessage(error: unknown, configured: boolean): string {
  const raw = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();

  // Rete irraggiungibile: è il caso più frequente in fase di configurazione.
  if (
    raw.includes('failed to fetch') ||
    raw.includes('network request failed') ||
    raw.includes('networkerror') ||
    raw.includes('load failed')
  ) {
    return configured
      ? 'Impossibile raggiungere il server. Controlla la connessione e riprova.'
      : 'Collegamento al database non configurato: nel file .env mancano URL e chiave del progetto Supabase. Finché non ci sono, l’accesso non può funzionare.';
  }

  if (raw.includes('invalid login credentials') || raw.includes('invalid credentials')) {
    return 'Email o password non corretti.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Devi confermare l’email prima di accedere. Controlla la posta.';
  }
  if (raw.includes('user already registered')) {
    return 'Esiste già un account con questa email.';
  }
  if (raw.includes('password should be at least')) {
    return 'La password è troppo corta: servono almeno 6 caratteri.';
  }
  if (raw.includes('unable to validate email') || raw.includes('invalid email')) {
    return 'Indirizzo email non valido.';
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Troppi tentativi. Aspetta qualche minuto e riprova.';
  }

  return error instanceof Error && error.message ? error.message : 'Accesso non riuscito.';
}
