// ============================================================================
// Contesto dell'utente che sta scrivendo all'agente.
//
// Il metodo del cervello impone "diagnosi prima della ricetta": senza sapere a
// che punto è la persona, l'agente può solo generalizzare o fare domande che
// l'app conosce già. Qui si costruisce un blocco compatto da iniettare nel
// system prompt.
//
// ⚠️ REGOLE DI PRIVACY (GDPR) — non derogabili:
//  · SOLO dati dell'utente che sta scrivendo, mai di altri.
//  · SOLO aggregati (conteggi, date relative). MAI nomi, contatti, note o
//    qualunque altro dato personale dei suoi clienti: finirebbero nel prompt
//    e quindi nella cronologia della conversazione.
//  · Per un leader, la squadra è un semplice conteggio: nessun nome, nessun
//    dato individuale dei collaboratori.
// ============================================================================
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type UserContext = {
  role: 'admin' | 'leader' | 'collaborator';
  firstName: string | null;
  daysSinceJoin: number | null;
  lessonsCompleted: number;
  clients: number;
  renewalsActive: number;
  renewalsExpiring30d: number;
  teamSize: number | null;
  hasTradingAccount: boolean;
};

/**
 * Carica il contesto con la service_role (bypassa la RLS) MA filtrando sempre
 * per `userId`, cioè l'utente autenticato dal JWT della richiesta.
 */
export async function loadUserContext(
  admin: SupabaseClient,
  userId: string,
): Promise<UserContext | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, role, created_at')
    .eq('id', userId)
    .single();
  if (!profile) return null;

  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const today = new Date().toISOString().slice(0, 10);
  const limit30 = in30Days.toISOString().slice(0, 10);

  // Solo conteggi: `head: true` non trasferisce nessuna riga.
  const count = (q: { count: number | null }) => q.count ?? 0;

  const [lessons, clients, renewalsActive, renewalsSoon, team, trading] = await Promise.all([
    admin.from('lesson_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('clients').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    admin
      .from('renewals')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'active'),
    admin
      .from('renewals')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'active')
      .gte('scadenza', today)
      .lte('scadenza', limit30),
    profile.role === 'collaborator'
      ? Promise.resolve({ count: null })
      : admin.from('profiles').select('id', { count: 'exact', head: true }).eq('leader_id', userId),
    admin.from('trading_accounts').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
  ]);

  const createdAt = profile.created_at ? new Date(profile.created_at) : null;
  const daysSinceJoin = createdAt
    ? Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 86_400_000))
    : null;

  return {
    role: profile.role,
    firstName: (profile.full_name ?? '').trim().split(/\s+/)[0] || null,
    daysSinceJoin,
    lessonsCompleted: count(lessons),
    clients: count(clients),
    renewalsActive: count(renewalsActive),
    renewalsExpiring30d: count(renewalsSoon),
    teamSize: profile.role === 'collaborator' ? null : count(team),
    hasTradingAccount: count(trading) > 0,
  };
}

/**
 * Rende il contesto come blocco testuale per il system prompt.
 * Volutamente asciutto: sono dati da usare per calibrare la risposta, non da
 * recitare all'utente.
 */
export function renderUserContext(ctx: UserContext): string {
  const roleLabel =
    ctx.role === 'admin' ? 'amministratore' : ctx.role === 'leader' ? 'leader' : 'collaboratore';

  const facts: string[] = [`ruolo: ${roleLabel}`];

  if (ctx.daysSinceJoin !== null) {
    const months = Math.floor(ctx.daysSinceJoin / 30);
    facts.push(
      ctx.daysSinceJoin < 45
        ? `sulla piattaforma da ${ctx.daysSinceJoin} giorni (è agli inizi)`
        : `sulla piattaforma da circa ${months} mesi`,
    );
  }
  facts.push(`lezioni completate: ${ctx.lessonsCompleted}`);
  facts.push(`clienti a CRM: ${ctx.clients}`);
  if (ctx.renewalsActive > 0) {
    facts.push(
      `rinnovi attivi: ${ctx.renewalsActive}` +
        (ctx.renewalsExpiring30d > 0 ? ` (${ctx.renewalsExpiring30d} in scadenza entro 30 giorni)` : ''),
    );
  }
  if (ctx.teamSize !== null) facts.push(`collaboratori diretti: ${ctx.teamSize}`);
  facts.push(ctx.hasTradingAccount ? 'ha collegato un conto MT5' : 'nessun conto MT5 collegato');

  return `CHI TI STA SCRIVENDO
${ctx.firstName ? `Si chiama ${ctx.firstName}. ` : ''}${facts.join('; ')}.

Usa questi dati per calibrare la risposta — profondità, esempi, quale leva ha senso — e per NON chiedere cose che già sai. Non elencarli e non commentarli: si accorgerebbe di essere profilato e suonerebbe artificiale. Sono una fotografia della piattaforma, non di tutta la sua attività: se un numero è a zero può voler dire che non usa quella sezione, non che non lavori. Nel dubbio chiedi, senza dare per scontato.`;
}
