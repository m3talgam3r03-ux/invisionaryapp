/**
 * Domini di competenza dell'agente, lato app.
 *
 * ⚠️ Devono restare allineati a `DOMAINS` in
 * `supabase/functions/_shared/brain.ts`: quello è il router che assegna il
 * boost nel retrieval, questo è ciò che l'admin può scegliere quando carica un
 * documento. Un dominio scritto qui e assente là produrrebbe documenti che non
 * ricevono mai priorità.
 *
 * L'allineamento non è affidato alla buona volontà: `scripts/eval-brain.mjs`
 * confronta le due liste e fallisce se divergono. La duplicazione esiste solo
 * perché i due file girano su runtime diversi (Deno / React Native) e non
 * possono condividere un modulo.
 */

export const DOMAIN_IDS = [
  'metodo',
  'vendita',
  'marketing',
  'network',
  'investimenti',
  'trading',
  'mindset',
  'piattaforma',
  'compliance',
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export const DOMAIN_LABELS: Record<DomainId, string> = {
  metodo: 'Metodo',
  vendita: 'Vendita',
  marketing: 'Marketing',
  network: 'Network marketing',
  investimenti: 'Investimenti',
  trading: 'Trading',
  mindset: 'Mindset',
  piattaforma: 'Piattaforma',
  compliance: 'Compliance',
};

export function domainLabel(id: string | null | undefined): string {
  if (!id) return 'Senza dominio';
  return DOMAIN_LABELS[id as DomainId] ?? id;
}
