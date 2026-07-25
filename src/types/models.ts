import type { Role } from '@/theme';

/** Riga della tabella `profiles`. */
export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  leader_id: string | null;
  created_at: string;
};

/** Riga della tabella `clients` (CRM). */
export type Client = {
  id: string;
  owner_id: string;
  nome: string;
  contatto: string | null;
  prodotto: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

/** Dati in ingresso per creare/aggiornare un cliente (owner_id lo imposta il DB). */
export type ClientInput = {
  nome: string;
  contatto?: string | null;
  prodotto?: string | null;
  note?: string | null;
};

export const RENEWAL_STATUS = ['active', 'renewed', 'lost'] as const;
export type RenewalStatus = (typeof RENEWAL_STATUS)[number];

/** Riga della tabella `renewals` (scadenzario). */
export type Renewal = {
  id: string;
  client_id: string | null;
  owner_id: string;
  prodotto: string | null;
  scadenza: string; // data ISO YYYY-MM-DD
  alert_days_before: number;
  status: RenewalStatus;
  reminder_sent_at: string | null;
  created_at: string;
};

/** Rinnovo con il nome del cliente collegato (join). */
export type RenewalWithClient = Renewal & {
  client: { nome: string } | null;
};

/** Dati in ingresso per creare/aggiornare un rinnovo (owner_id lo imposta il DB). */
export type RenewalInput = {
  client_id?: string | null;
  prodotto?: string | null;
  scadenza: string;
  alert_days_before?: number;
  status?: RenewalStatus;
};
