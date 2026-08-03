/**
 * Test del modulo permessi (src/lib/permissions.ts).
 *
 * Sono test puri: nessuna rete, nessun database, girano sempre. Verificano la
 * regola scritta nell'app; che il database applichi la stessa regola lo verifica
 * `rls.test.ts`. Servono entrambi: nascondere un pulsante non protegge un dato.
 */
import { describe, expect, it } from 'vitest';

import { can, canBeAssignedAsLeader, expectsLeader } from '@/lib/permissions';
import type { Profile } from '@/types/models';

function profilo(role: Profile['role'], id = 'me', leaderId: string | null = null): Profile {
  return { id, full_name: 'Tizio', role, leader_id: leaderId, created_at: '2026-01-01T00:00:00Z' };
}

const admin = profilo('admin', 'admin-1');
const leader = profilo('leader', 'leader-1');
const collaboratore = profilo('collaboratore', 'collab-1', 'leader-1');

describe('can() — pannello amministratore', () => {
  it('lo apre solo l’admin', () => {
    expect(can(admin, 'admin.panel')).toBe(true);
    expect(can(leader, 'admin.panel')).toBe(false);
    expect(can(collaboratore, 'admin.panel')).toBe(false);
  });
});

describe('can() — base di conoscenza dell’agente', () => {
  it('la gestisce solo l’admin', () => {
    expect(can(admin, 'knowledge.manage')).toBe(true);
    expect(can(leader, 'knowledge.manage')).toBe(false);
    expect(can(collaboratore, 'knowledge.manage')).toBe(false);
  });
});

describe('can() — avanzamento formazione della rete', () => {
  it('lo vedono admin e leader, non il collaboratore', () => {
    expect(can(admin, 'network.progress')).toBe(true);
    expect(can(leader, 'network.progress')).toBe(true);
    expect(can(collaboratore, 'network.progress')).toBe(false);
  });
});

describe('can() — lettura dei dati di un membro', () => {
  it('ognuno legge i propri dati', () => {
    expect(can(collaboratore, 'member.read', { ownerId: 'collab-1' })).toBe(true);
    expect(can(leader, 'member.read', { ownerId: 'leader-1' })).toBe(true);
  });

  it('il leader legge i dati dei propri collaboratori', () => {
    expect(can(leader, 'member.read', { ownerId: 'collab-1', leaderId: 'leader-1' })).toBe(true);
  });

  it('il leader NON legge i collaboratori di un altro leader', () => {
    expect(can(leader, 'member.read', { ownerId: 'collab-9', leaderId: 'leader-altro' })).toBe(false);
  });

  it('il collaboratore non legge nessun altro, nemmeno il proprio leader', () => {
    expect(can(collaboratore, 'member.read', { ownerId: 'leader-1' })).toBe(false);
    expect(can(collaboratore, 'member.read', { ownerId: 'collab-2', leaderId: 'leader-1' })).toBe(false);
  });

  it('l’admin legge chiunque', () => {
    expect(can(admin, 'member.read', { ownerId: 'chiunque' })).toBe(true);
  });

  it('senza risorsa indicata nega, invece di tirare a indovinare', () => {
    expect(can(leader, 'member.read')).toBe(false);
  });
});

describe('can() — scadenzario della rete', () => {
  it('lo vedono admin e leader, il collaboratore vede solo i propri rinnovi', () => {
    expect(can(admin, 'renewals.network')).toBe(true);
    expect(can(leader, 'renewals.network')).toBe(true);
    expect(can(collaboratore, 'renewals.network')).toBe(false);
  });
});

describe('can() — approvazione dei rinnovi', () => {
  it('il leader approva i rinnovi dei propri collaboratori', () => {
    expect(can(leader, 'renewals.approve', { ownerId: 'collab-1', leaderId: 'leader-1' })).toBe(true);
  });

  it('il leader NON approva i collaboratori di un altro leader', () => {
    expect(can(leader, 'renewals.approve', { ownerId: 'collab-9', leaderId: 'leader-altro' })).toBe(
      false,
    );
  });

  it('un collaboratore non si auto-approva', () => {
    expect(can(collaboratore, 'renewals.approve', { ownerId: 'collab-1' })).toBe(false);
  });

  it('nemmeno un leader si auto-approva', () => {
    expect(can(leader, 'renewals.approve', { ownerId: 'leader-1' })).toBe(false);
  });

  it('l’admin approva chiunque, compreso se stesso: sopra di lui non c’è nessuno', () => {
    expect(can(admin, 'renewals.approve', { ownerId: 'collab-1', leaderId: 'leader-1' })).toBe(true);
    expect(can(admin, 'renewals.approve', { ownerId: 'admin-1' })).toBe(true);
  });

  it('senza sapere di chi è il rinnovo, nega', () => {
    expect(can(leader, 'renewals.approve')).toBe(false);
  });
});

describe('can() — utente non caricato', () => {
  it('nel dubbio nega tutto', () => {
    for (const azione of ['admin.panel', 'knowledge.manage', 'network.progress'] as const) {
      expect(can(null, azione)).toBe(false);
      expect(can(undefined, azione)).toBe(false);
    }
  });
});

describe('predicati sul ruolo', () => {
  it('solo il collaboratore ha un leader', () => {
    expect(expectsLeader('collaboratore')).toBe(true);
    expect(expectsLeader('leader')).toBe(false);
    expect(expectsLeader('admin')).toBe(false);
  });

  it('solo un leader può essere assegnato come leader', () => {
    expect(canBeAssignedAsLeader('leader')).toBe(true);
    expect(canBeAssignedAsLeader('admin')).toBe(false);
    expect(canBeAssignedAsLeader('collaboratore')).toBe(false);
  });
});
