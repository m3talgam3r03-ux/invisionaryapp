import type { Role } from '@/theme';

/** Riga della tabella `profiles`. */
export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  leader_id: string | null;
  /** Conduce le call VIP: lo assegna solo l'admin. */
  vip_call_host: boolean;
  /**
   * Regione dichiarata, facoltativa. Esce solo aggregata sulla mappa, mai per
   * riga: il CHECK del database tiene l'elenco chiuso alle 20 ufficiali.
   */
  regione: string | null;
  created_at: string;
};

/** Fasi della trattativa, in ordine di avanzamento. */
export const CONTACT_STATI = ['nuovo', 'contattato', 'appuntamento', 'cliente', 'perso'] as const;
export type ContactStato = (typeof CONTACT_STATI)[number];

/** Basi giuridiche ammesse per trattare i dati di un contatto importato. */
export const BASI_GIURIDICHE = [
  'consenso',
  'contratto',
  'obbligo_legale',
  'legittimo_interesse',
] as const;
export type BaseGiuridica = (typeof BASI_GIURIDICHE)[number];

/** Un'importazione con la sua dichiarazione: è la risposta a «perché avete questi dati». */
export type ImportBatch = {
  id: string;
  owner_id: string;
  nome_file: string | null;
  origine_dati: string;
  base_giuridica: BaseGiuridica;
  righe_totali: number;
  righe_importate: number;
  righe_duplicate: number;
  created_at: string;
};

/** Riga della tabella `clients` (CRM). */
export type Client = {
  id: string;
  owner_id: string;
  nome: string;
  contatto: string | null;
  /** Email in minuscolo, per il confronto; il testo originale resta in `contatto`. */
  email: string | null;
  /** Telefono in E.164, per il confronto; il testo originale resta in `contatto`. */
  telefono_e164: string | null;
  import_batch_id: string | null;
  prodotto: string | null;
  note: string | null;
  stato: ContactStato;
  /** `manuale`, `import`, oppure `funnel:<slug>`. */
  origine: string;
  tags: string[];
  ultimo_contatto_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Dati in ingresso per creare/aggiornare un cliente (owner_id lo imposta il DB). */
export type ClientInput = {
  nome: string;
  contatto?: string | null;
  email?: string | null;
  telefono_e164?: string | null;
  prodotto?: string | null;
  note?: string | null;
  stato?: ContactStato;
  origine?: string;
  tags?: string[];
  import_batch_id?: string | null;
};

/** I canali su cui si può essere contattati. Ognuno è una decisione separata. */
export const CANALI = ['email', 'sms', 'whatsapp', 'telefono'] as const;
export type Canale = (typeof CANALI)[number];

/** Consenso corrente per un canale. */
export type ContactConsent = {
  id: string;
  client_id: string;
  canale: Canale;
  valore: boolean;
  origine: 'manuale' | 'import' | 'funnel';
  testo_informativa: string | null;
  registrato_da: string | null;
  created_at: string;
};

/** Riga di `consent_history`: la prova di quando un consenso è stato dato o tolto. */
export type ConsentHistoryEntry = {
  id: string;
  client_id: string;
  canale: Canale;
  valore: boolean;
  origine: string | null;
  testo_informativa: string | null;
  actor_id: string | null;
  created_at: string;
};

/** Riga di `contact_status_history`: chi ha spostato il contatto, da dove a dove. */
export type ContactStatusHistoryEntry = {
  id: string;
  client_id: string;
  da_stato: ContactStato | null;
  a_stato: ContactStato;
  actor_id: string | null;
  created_at: string;
};

export const RENEWAL_STATUS = ['attivo', 'in_attesa_approvazione', 'scaduto', 'annullato'] as const;
export type RenewalStatus = (typeof RENEWAL_STATUS)[number];

/** Riga della tabella `renewals` (scadenzario). */
export type Renewal = {
  id: string;
  client_id: string | null;
  owner_id: string;
  prodotto: string | null;
  /** Scadenza corrente, ISO YYYY-MM-DD. Il rinnovo somma su QUESTA, non su oggi. */
  current_due_date: string;
  /** Durata del rinnovo in giorni (default 30). */
  interval_days: number;
  status: RenewalStatus;
  requested_at: string | null;
  requested_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  note: string | null;
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
  current_due_date: string;
  interval_days?: number;
  status?: RenewalStatus;
  note?: string | null;
};

export const RENEWAL_ACTIONS = [
  'creato',
  'rinnovo_richiesto',
  'approvato',
  'rifiutato',
  'data_modificata',
  'annullato',
] as const;
export type RenewalAction = (typeof RENEWAL_ACTIONS)[number];

/** Riga di `renewal_history`: append-only, una per transizione. */
export type RenewalHistoryEntry = {
  id: string;
  renewal_id: string;
  action: RenewalAction;
  old_due_date: string | null;
  new_due_date: string | null;
  actor_id: string | null;
  created_at: string;
};

// --- Formazione -------------------------------------------------------------

/** Riga della tabella `courses`. */
export type Course = {
  id: string;
  titolo: string;
  descrizione: string | null;
  ordine: number;
  created_at: string;
};

/** Riga della tabella `lessons`. */
export type Lesson = {
  id: string;
  course_id: string;
  titolo: string;
  youtube_id: string;
  ordine: number;
  /** Durata indicativa in minuti; non tutte le lezioni la dichiarano. */
  duration_min: number | null;
  created_at: string;
};

/** Riga della tabella `events` (calendario formazione). Rinominato per non confliggere con il DOM Event. */
export type EventItem = {
  id: string;
  titolo: string;
  descrizione: string | null;
  start_at: string;
  end_at: string | null;
  created_by: string | null;
  created_at: string;
};

/** Riga della tabella `documents` (base di conoscenza RAG). */
export type Document = {
  id: string;
  source: string | null;
  content: string;
  created_at: string;
};

/** Riga della tabella `feedback_posts` (Community). */
export type FeedbackPost = {
  id: string;
  owner_id: string;
  author_name: string | null;
  body: string | null;
  photo_url: string | null;
  created_at: string;
};

// --- Trading (MT5 read-only) -----------------------------------------------

export type TradingAccount = {
  id: string;
  owner_id: string;
  provider: string | null;
  login: string | null;
  server: string | null;
  platform: string | null;
  region: string | null;
  state: string | null;
  name: string | null;
  balance: number | null;
  equity: number | null;
  currency: string | null;
  last_synced_at: string | null;
  created_at: string;
};

export type Trade = {
  id: string;
  account_id: string | null;
  owner_id: string;
  external_id: string | null;
  symbol: string | null;
  type: string | null;
  volume: number | null;
  price: number | null;
  profit: number | null;
  commission: number | null;
  swap: number | null;
  entry_type: string | null;
  time: string | null;
  /** Lega ingresso e uscita della stessa operazione (MetaApi positionId). */
  position_id: string | null;
  created_at: string;
};
