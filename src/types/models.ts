import type { Role } from '@/theme';

/** Riga della tabella `profiles`. */
export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  leader_id: string | null;
  created_at: string;
};
