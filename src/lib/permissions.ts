/**
 * Permessi Invisionary — unico punto di verità.
 *
 * Nessun `role === '...'` deve comparire altrove nell'app: le schermate chiedono
 * `can(profilo, azione)` e questo modulo decide. Così i permessi si leggono in un
 * posto solo, si testano senza React, e un domani cambiare un valore di ruolo
 * significa toccare questo file e non trenta schermate.
 *
 * ⚠️ Nascondere ≠ proteggere. Ciò che qui risulta negato deve essere negato anche
 * dalle policy RLS del database: questo modulo governa l'interfaccia, non la
 * sicurezza. La sicurezza è in Postgres.
 */
import type { Role } from '@/theme';
import type { Profile } from '@/types/models';

/** Azioni governate dai permessi. */
export type Action =
  /** Aprire il pannello amministratore e modificare ruoli e gerarchia. */
  | 'admin.panel'
  /** Gestire la base di conoscenza dell'agente AI. */
  | 'knowledge.manage'
  /** Vedere l'avanzamento formazione della propria rete. */
  | 'network.progress'
  /** Vedere lo scadenzario di tutta la rete, non solo i propri rinnovi. */
  | 'renewals.network'
  /** Approvare il rinnovo di qualcuno (richiede `resource`). */
  | 'renewals.approve'
  /** Leggere i dati di un membro della rete (richiede `resource`). */
  | 'member.read';

/**
 * Il "chi possiede cosa" di una riga, per le azioni che dipendono dal dato e non
 * solo dal ruolo. Rispecchia le colonne usate dalle policy RLS.
 */
export type Resource = {
  /** Proprietario della riga (`owner_id` / `user_id`). */
  ownerId: string;
  /** Leader del proprietario, quando noto (`profiles.leader_id`). */
  leaderId?: string | null;
};

/**
 * Vero se `user` può compiere `action`.
 * Un utente non caricato non può nulla: in dubbio si nega.
 */
export function can(user: Profile | null | undefined, action: Action, resource?: Resource): boolean {
  if (!user) return false;

  switch (action) {
    case 'admin.panel':
    case 'knowledge.manage':
      return user.role === 'admin';

    case 'network.progress':
    case 'renewals.network':
      return user.role === 'admin' || user.role === 'leader';

    // Rispecchia can_approve_renewal() del database.
    // L'admin è l'autorità finale e approva anche i propri rinnovi: sopra di lui
    // non c'è nessuno, e negarglielo li bloccherebbe per sempre.
    // Tutti gli altri approvano solo rinnovi altrui, e solo dei propri
    // collaboratori diretti.
    case 'renewals.approve': {
      if (!resource) return false;
      if (user.role === 'admin') return true;
      if (resource.ownerId === user.id) return false;
      return user.role === 'leader' && resource.leaderId === user.id;
    }

    // Rispecchia can_read_member() del database: sono io, è un mio
    // collaboratore, oppure sono admin.
    case 'member.read': {
      if (!resource) return false;
      if (user.role === 'admin') return true;
      if (resource.ownerId === user.id) return true;
      return user.role === 'leader' && resource.leaderId === user.id;
    }
  }
}

// --- Predicati sul ruolo ----------------------------------------------------
// Non sono permessi ma regole di modello: stanno qui perché anche loro
// dipendono dal valore del ruolo, che deve restare confinato in questo file.

/** Solo i collaboratori hanno un leader assegnato. */
export function expectsLeader(role: Role): boolean {
  return role === 'collaboratore';
}

/** Solo chi ha ruolo leader può essere assegnato come leader di qualcun altro. */
export function canBeAssignedAsLeader(role: Role): boolean {
  return role === 'leader';
}
