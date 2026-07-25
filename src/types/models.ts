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
